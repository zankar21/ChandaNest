import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";
import { env } from "../../config/env";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";

type Facts = {
  intent?: string;
  category?: string;
  propertyType?: string;
  subType?: string;
  saleType?: string;
  landUse?: string;
  location?: { locality?: string; city?: string };
  area?: { value?: number; unit?: string };
  pricing?: { totalPrice?: number; pricePerSqFt?: number; rentPerMonth?: number; deposit?: number };
  specs?: {
    bhk?: number;
    bathrooms?: number;
    carpetAreaSqFt?: number;
    builtUpAreaSqFt?: number;
    floor?: number;
  };
  landRecord?: { mouza?: string; taluka?: string; district?: string; wardOrWarg?: string };
};

type AiMeta = { model: string; generatedAt: string; sourceHash: string };

function isPlatformAdmin(user: AuthUser) {
  if (user.role === "platform_admin") return true;
  return env.platformAdminUids.includes(user.uid);
}

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = stripUndefined(value);
      if (Object.keys(nested).length > 0) output[key] = nested;
      return;
    }
    output[key] = value;
  });
  return output as T;
}

function stableStringify(value: unknown) {
  const seen = new WeakSet();
  const sorter = (val: any): any => {
    if (val === null || typeof val !== "object") return val;
    if (seen.has(val)) return undefined;
    seen.add(val);
    if (Array.isArray(val)) return val.map(sorter);
    return Object.keys(val)
      .sort()
      .reduce((acc: Record<string, any>, key) => {
        acc[key] = sorter(val[key]);
        return acc;
      }, {});
  };
  return JSON.stringify(sorter(value));
}

function sanitizeText(text: string) {
  return text
    .replace(/\b\d{8,}\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

export function computeSourceHash(facts: Facts) {
  return crypto.createHash("sha256").update(stableStringify(facts)).digest("hex");
}

export function buildListingFacts(listing: any): Facts {
  const location = stripUndefined({
    locality: listing?.location?.locality,
    city: listing?.location?.city || listing?.location?.citySlug
  });
  const area = stripUndefined({
    value: listing?.area?.value,
    unit: listing?.area?.unit
  });
  const pricing = stripUndefined({
    totalPrice: listing?.pricing?.totalPrice,
    pricePerSqFt: listing?.pricing?.rate,
    rentPerMonth: listing?.pricing?.rentPerMonth,
    deposit: listing?.pricing?.deposit
  });
  const specs = stripUndefined({
    bhk: listing?.specs?.flat?.bhk ?? listing?.specs?.house?.bhk,
    bathrooms: listing?.specs?.flat?.bathrooms ?? listing?.specs?.house?.bathrooms,
    carpetAreaSqFt: listing?.specs?.flat?.carpetAreaSqFt ?? listing?.specs?.house?.carpetAreaSqFt,
    builtUpAreaSqFt: listing?.specs?.flat?.builtUpAreaSqFt ?? listing?.specs?.house?.builtUpAreaSqFt,
    floor: listing?.specs?.flat?.floor ?? listing?.specs?.house?.floor
  });
  const landRecord = stripUndefined({
    mouza: listing?.landRecord?.mouza,
    taluka: listing?.landRecord?.taluka,
    district: listing?.landRecord?.district,
    wardOrWarg: listing?.landRecord?.wardOrWarg
  });

  return stripUndefined({
    intent: listing?.type,
    category: listing?.category,
    propertyType: listing?.propertyType,
    subType: listing?.subType || listing?.metadata?.subType,
    saleType: listing?.saleType,
    landUse: listing?.landUse || listing?.landRecord?.landUse,
    location: Object.keys(location).length ? location : undefined,
    area: Object.keys(area).length ? area : undefined,
    pricing: Object.keys(pricing).length ? pricing : undefined,
    specs: Object.keys(specs).length ? specs : undefined,
    landRecord: Object.keys(landRecord).length ? landRecord : undefined
  });
}

export function buildPrompt(facts: Facts) {
  const factsText = stableStringify(facts);
  return [
    "You are writing a professional real estate listing description for an Indian market audience.",
    "Rules:",
    "- Use only the facts provided. Do not invent or assume.",
    "- Do not include phone numbers, emails, personal names, or legal claims.",
    "- Output 1 paragraph plus 3 short bullet highlights.",
    "- Keep 350 to 700 characters total.",
    "",
    "Facts:",
    factsText
  ].join("\n");
}

async function callGemini(prompt: string) {
  if (!env.geminiApiKey) throw new Error("GEMINI_API_KEY is not set");
  const client = new GoogleGenerativeAI(env.geminiApiKey);
  const model = client.getGenerativeModel({ model: env.geminiModel });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function enforceLength(text: string) {
  const minChars = env.aiDescMinChars;
  const maxChars = env.aiDescMaxChars;
  if (text.length > maxChars) return text.slice(0, maxChars).trim();
  return text;
}

export async function generateDescriptionForListing(listing: any) {
  const facts = buildListingFacts(listing);
  const sourceHash = computeSourceHash(facts);
  const prompt = buildPrompt(facts);
  let text = sanitizeText(await callGemini(prompt));

  if (text.length < env.aiDescMinChars) {
    const retryPrompt = `${prompt}\n\nPlease add more detail while staying within the rules.`;
    text = sanitizeText(await callGemini(retryPrompt));
  }

  text = enforceLength(text);

  const meta: AiMeta = {
    model: env.geminiModel,
    generatedAt: new Date().toISOString(),
    sourceHash
  };

  return { text, meta, facts, sourceHash };
}

export async function generateListingDescription(params: {
  tenantId: string;
  listingId: string;
  user: AuthUser;
  setActive?: boolean;
  force?: boolean;
}) {
  const { tenantId, listingId, user, setActive, force } = params;
  if (user.tenantId !== tenantId && !isPlatformAdmin(user)) {
    throw new Error("Forbidden");
  }

  const listingRef = firestore.collection("tenants").doc(tenantId).collection("listings").doc(listingId);
  const snap = await listingRef.get();
  if (!snap.exists) throw new Error("NotFound");
  const listing = snap.data() || {};

  const { text, meta, sourceHash } = await generateDescriptionForListing(listing);
  const existingHash = listing?.description?.aiMeta?.sourceHash || null;
  if (existingHash && existingHash === sourceHash && !force) {
    return { skipped: true, description: listing?.description || null };
  }

  const nextDescription = stripUndefined({
    ...(typeof listing.description === "object" ? listing.description : {}),
    ai: text,
    aiMeta: meta,
    active: setActive === false ? listing?.description?.active || "user" : "ai"
  });

  await listingRef.set(
    {
      description: nextDescription
    },
    { merge: true }
  );

  await firestore.collection("audit_logs").doc().set({
    tenantId,
    actorUid: user.uid,
    actorRole: user.role,
    action: "AI_DESC_GENERATED",
    entityType: "listing",
    entityId: listingId,
    metadata: { sourceHash, model: meta.model },
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { skipped: false, description: nextDescription };
}
