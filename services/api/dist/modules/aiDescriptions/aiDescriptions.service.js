"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSourceHash = computeSourceHash;
exports.buildListingFacts = buildListingFacts;
exports.buildPrompt = buildPrompt;
exports.generateDescriptionForListing = generateDescriptionForListing;
exports.generateListingDescription = generateListingDescription;
const crypto_1 = __importDefault(require("crypto"));
const generative_ai_1 = require("@google/generative-ai");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const env_1 = require("../../config/env");
const firebase_1 = require("../../config/firebase");
function isPlatformAdmin(user) {
    if (user.role === "platform_admin")
        return true;
    return env_1.env.platformAdminUids.includes(user.uid);
}
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value === undefined)
            return;
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const nested = stripUndefined(value);
            if (Object.keys(nested).length > 0)
                output[key] = nested;
            return;
        }
        output[key] = value;
    });
    return output;
}
function stableStringify(value) {
    const seen = new WeakSet();
    const sorter = (val) => {
        if (val === null || typeof val !== "object")
            return val;
        if (seen.has(val))
            return undefined;
        seen.add(val);
        if (Array.isArray(val))
            return val.map(sorter);
        return Object.keys(val)
            .sort()
            .reduce((acc, key) => {
            acc[key] = sorter(val[key]);
            return acc;
        }, {});
    };
    return JSON.stringify(sorter(value));
}
function sanitizeText(text) {
    return text
        .replace(/\b\d{8,}\b/g, "")
        .replace(/\s+/g, " ")
        .replace(/\s+([.,;:])/g, "$1")
        .trim();
}
function computeSourceHash(facts) {
    return crypto_1.default.createHash("sha256").update(stableStringify(facts)).digest("hex");
}
function buildListingFacts(listing) {
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
function buildPrompt(facts) {
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
async function callGemini(prompt) {
    if (!env_1.env.geminiApiKey)
        throw new Error("GEMINI_API_KEY is not set");
    const client = new generative_ai_1.GoogleGenerativeAI(env_1.env.geminiApiKey);
    const model = client.getGenerativeModel({ model: env_1.env.geminiModel });
    const result = await model.generateContent(prompt);
    return result.response.text();
}
function enforceLength(text) {
    const minChars = env_1.env.aiDescMinChars;
    const maxChars = env_1.env.aiDescMaxChars;
    if (text.length > maxChars)
        return text.slice(0, maxChars).trim();
    return text;
}
async function generateDescriptionForListing(listing) {
    const facts = buildListingFacts(listing);
    const sourceHash = computeSourceHash(facts);
    const prompt = buildPrompt(facts);
    let text = sanitizeText(await callGemini(prompt));
    if (text.length < env_1.env.aiDescMinChars) {
        const retryPrompt = `${prompt}\n\nPlease add more detail while staying within the rules.`;
        text = sanitizeText(await callGemini(retryPrompt));
    }
    text = enforceLength(text);
    const meta = {
        model: env_1.env.geminiModel,
        generatedAt: new Date().toISOString(),
        sourceHash
    };
    return { text, meta, facts, sourceHash };
}
async function generateListingDescription(params) {
    const { tenantId, listingId, user, setActive, force } = params;
    if (user.tenantId !== tenantId && !isPlatformAdmin(user)) {
        throw new Error("Forbidden");
    }
    const listingRef = firebase_1.firestore.collection("tenants").doc(tenantId).collection("listings").doc(listingId);
    const snap = await listingRef.get();
    if (!snap.exists)
        throw new Error("NotFound");
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
    await listingRef.set({
        description: nextDescription
    }, { merge: true });
    await firebase_1.firestore.collection("audit_logs").doc().set({
        tenantId,
        actorUid: user.uid,
        actorRole: user.role,
        action: "AI_DESC_GENERATED",
        entityType: "listing",
        entityId: listingId,
        metadata: { sourceHash, model: meta.model },
        createdAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    });
    return { skipped: false, description: nextDescription };
}
