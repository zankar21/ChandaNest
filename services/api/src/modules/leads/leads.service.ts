import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { AuthUser } from "../../types";
import { hashIp } from "../../utils/rateLimit";
import { hasPermission } from "../memberships/permissions";
import {
  AdminLeadCreateSchema,
  AdminLeadUpdateSchema,
  LeadAssignSchema,
  LeadNoteCreateSchema,
  LeadQuerySchema,
  LeadStageUpdateSchema,
  PublicLeadCreateSchema
} from "./leads.schemas";
import { LeadDoc, LeadNoteDoc, LeadStage, LeadStatus } from "./leads.types";
import { deepStripUndefined } from "../properties/properties.service";

type PublicLeadInput = {
  body: unknown;
  meta?: { userAgent?: string; ip?: string };
};

type ListInput = {
  tenantId: string;
  user: AuthUser;
  query: unknown;
};

function normalizePhone(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (!digits) return undefined;
  return hasPlus ? `+${digits}` : digits;
}

function resolveStatus(stage: LeadStage, lostReason?: string): LeadStatus {
  const isClosed = stage === "closed_won" || stage === "closed_lost";
  return deepStripUndefined({
    isOpen: !isClosed,
    lostReason: stage === "closed_lost" ? lostReason : undefined
  }) as LeadStatus;
}

function isLeadAdmin(user: AuthUser) {
  return (
    user.role === "tenant_admin" ||
    user.role === "client_admin" ||
    user.role === "platform_admin" ||
    user.role === "master_admin"
  );
}

function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [timestamp, id] = Buffer.from(cursor, "base64").toString("utf8").split("|");
  if (!timestamp || !id) return null;
  return { timestamp: Number(timestamp), id };
}

function encodeCursor(updatedAt: FirebaseFirestore.Timestamp, id: string) {
  return Buffer.from(`${updatedAt.toMillis()}|${id}`, "utf8").toString("base64");
}

function ensureValidTenantId(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new Error("INVALID_TENANT");
  }
  return trimmed;
}

function ensureTenantId(user: AuthUser, tenantId?: string | null) {
  if (!tenantId) throw new Error("Tenant required");
  ensureValidTenantId(tenantId);
  if (user.tenantId !== tenantId && user.role !== "platform_admin") {
    throw new Error("Forbidden");
  }
}

function resolvePublicTenantId(inputTenantId?: string) {
  // Public lead capture is restricted to a marketplace tenant or explicit allowlist.
  if (env.publicMarketplaceTenantId) return env.publicMarketplaceTenantId;
  const candidate = (inputTenantId || "").trim();
  if (!candidate || !env.publicLeadTenantAllowlist.includes(candidate)) {
    throw new Error("INVALID_TENANT");
  }
  return candidate;
}

function formatMinuteBucket(now: Date) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
}

async function enforceLeadRateLimit(ipHash?: string) {
  if (!ipHash) return;
  if (env.nodeEnv === "production" && !env.leadsRateLimitSalt) {
    throw new Error("Missing rate limit salt");
  }
  const bucket = formatMinuteBucket(new Date());
  const docId = `leads_${ipHash}_${bucket}`;
  const ref = firestore.collection("rateLimits").doc(docId);
  const limit = 5;
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? Number(snap.get("count") || 0) : 0;
    if (count >= limit) {
      throw new Error("RATE_LIMITED");
    }
    tx.set(
      ref,
      {
        count: count + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

async function assertTenantLeadExists(tenantId: string, leadId: string) {
  const ref = firestore.collection("tenants").doc(tenantId).collection("leads").doc(leadId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  return { ref, snap };
}

export async function createPublicLead(
  input: PublicLeadInput,
  deps?: { createLeadDoc?: (tenantId: string, doc: LeadDoc) => Promise<string> }
) {
  const payload = PublicLeadCreateSchema.parse(input.body);
  if (payload.website) {
    return { leadId: "ignored", ignored: true };
  }
  const tenantId = resolvePublicTenantId(payload.tenantId);
  ensureValidTenantId(tenantId);

  const phone = normalizePhone(payload.contact.phone);
  const email = payload.contact.email?.trim();
  if (!phone && !email) {
    throw new Error("Phone or email required");
  }

  if (payload.contact.message && payload.contact.message.length > 1000) {
    throw new Error("Message too long");
  }

  const salt = env.leadsRateLimitSalt || env.ipHashSalt;
  const ipHash = input.meta?.ip ? hashIp(input.meta.ip, salt) : undefined;
  await enforceLeadRateLimit(ipHash);

  const now = admin.firestore.FieldValue.serverTimestamp();
  const stage: LeadStage = "new";
  const doc: LeadDoc = {
    id: "pending",
    tenantId,
    subject: payload.subject,
    contact: deepStripUndefined({
      name: payload.contact.name?.trim() || undefined,
      phone,
      email,
      message: payload.contact.message?.trim() || undefined
    }),
    stage,
    status: resolveStatus(stage),
    source: deepStripUndefined({
      channel: "web",
      page: payload.source?.page,
      utm: payload.source?.utm,
      userAgent: input.meta?.userAgent,
      ipHash
    }),
    priority: "medium",
    createdAt: now,
    updatedAt: now
  };

  if (deps?.createLeadDoc) {
    const leadId = await deps.createLeadDoc(tenantId, doc);
    return { leadId };
  }
  const ref = firestore.collection("tenants").doc(tenantId).collection("leads").doc();
  await ref.set(deepStripUndefined({ ...doc, id: ref.id }));
  return { leadId: ref.id };
}

export function canAccessLead(input: {
  user: { uid: string; role?: string | null };
  lead: { principalType?: string | null; principalId?: string | null };
  memberships: { orgType?: string | null; orgId?: string | null; role?: string | null; status?: string | null }[];
  permission: "leads.read" | "leads.manage";
}): boolean {
  const principalType = input.lead.principalType;
  const principalId = input.lead.principalId;
  if (!principalType || !principalId) return false;
  const member = input.memberships.find(
    (m) =>
      m.orgType === principalType &&
      m.orgId === principalId &&
      (!m.status || m.status === "active")
  );
  if (!member) return false;
  return hasPermission(member.role || undefined, input.permission);
}

export async function listLeads(input: ListInput) {
  const parsed = LeadQuerySchema.parse(input.query);
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");

  let ref: FirebaseFirestore.Query = firestore
    .collection("tenants")
    .doc(input.tenantId)
    .collection("leads")
    .orderBy("updatedAt", "desc")
    .orderBy(admin.firestore.FieldPath.documentId(), "desc");

  if (parsed.stage) ref = ref.where("stage", "==", parsed.stage);
  if (parsed.assignee) ref = ref.where("assignee.uid", "==", parsed.assignee);
  if (parsed.from) ref = ref.where("updatedAt", ">=", new Date(parsed.from));
  if (parsed.to) ref = ref.where("updatedAt", "<=", new Date(parsed.to));

  if (parsed.cursor) {
    const decoded = decodeCursor(parsed.cursor);
    if (decoded) {
      ref = ref.startAfter(admin.firestore.Timestamp.fromMillis(decoded.timestamp), decoded.id);
    }
  }

  const limit = parsed.limit || 25;
  const snap = await ref.limit(limit).get();
  let items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (parsed.q) {
    const needle = parsed.q.toLowerCase().trim();
    items = items.filter((item: any) => {
      const contact = item.contact || {};
      const subject = item.subject || {};
      const hay = [
        contact.name,
        contact.phone,
        contact.email,
        subject.title,
        subject.city,
        subject.area
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }
  const last = snap.docs[snap.docs.length - 1];
  const nextCursor =
    last && last.get("updatedAt") instanceof admin.firestore.Timestamp
      ? encodeCursor(last.get("updatedAt"), last.id)
      : undefined;
  return { items, nextCursor };
}

export async function getLead(input: { tenantId: string; user: AuthUser; leadId: string }) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const { snap } = await assertTenantLeadExists(input.tenantId, input.leadId);
  return { id: snap.id, ...snap.data() };
}

export async function createAdminLead(input: { tenantId: string; user: AuthUser; body: unknown }) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const payload = AdminLeadCreateSchema.parse(input.body);
  const phone = normalizePhone(payload.contact.phone);
  const email = payload.contact.email?.trim();
  if (!phone && !email) {
    throw new Error("Phone or email required");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  const stage = payload.stage || "new";
  const doc: LeadDoc = {
    id: "pending",
    tenantId: input.tenantId,
    subject: payload.subject,
    contact: deepStripUndefined({
      name: payload.contact.name?.trim() || undefined,
      phone,
      email,
      message: payload.contact.message?.trim() || undefined
    }),
    stage,
    status: resolveStatus(stage),
    priority: payload.priority || "medium",
    tags: payload.tags,
    source: { channel: "agent" },
    createdAt: now,
    updatedAt: now
  };
  const ref = firestore.collection("tenants").doc(input.tenantId).collection("leads").doc();
  await ref.set(deepStripUndefined({ ...doc, id: ref.id }));
  return { leadId: ref.id };
}

export async function updateLead(input: { tenantId: string; user: AuthUser; leadId: string; body: unknown }) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const payload = AdminLeadUpdateSchema.parse(input.body);
  const nextPhone = payload.contact ? normalizePhone(payload.contact.phone) : undefined;
  const nextEmail = payload.contact ? payload.contact.email?.trim() : undefined;
  if (payload.contact && !nextPhone && !nextEmail) {
    throw new Error("Phone or email required");
  }
  const { ref } = await assertTenantLeadExists(input.tenantId, input.leadId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    deepStripUndefined({
      subject: payload.subject,
      contact: payload.contact
        ? deepStripUndefined({
            name: payload.contact.name?.trim() || undefined,
            phone: nextPhone,
            email: nextEmail,
            message: payload.contact.message?.trim() || undefined
          })
        : undefined,
      priority: payload.priority,
      tags: payload.tags,
      updatedAt: now
    }),
    { merge: true }
  );
  return { leadId: input.leadId };
}

export async function assignLead(input: { tenantId: string; user: AuthUser; leadId: string; body: unknown }) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const payload = LeadAssignSchema.parse(input.body);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const { ref } = await assertTenantLeadExists(input.tenantId, input.leadId);
  await ref.set(
    deepStripUndefined({
      assignee: deepStripUndefined({
        uid: payload.uid,
        name: payload.name,
        role: payload.role
      }),
      updatedAt: now
    }),
    { merge: true }
  );
  return { leadId: input.leadId };
}

export async function updateLeadStage(input: {
  tenantId: string;
  user: AuthUser;
  leadId: string;
  body: unknown;
}) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const payload = LeadStageUpdateSchema.parse(input.body);
  if (payload.stage === "closed_lost" && !payload.lostReason) {
    throw new Error("Lost reason required");
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  const { ref } = await assertTenantLeadExists(input.tenantId, input.leadId);
  const lastContactedAt =
    payload.stage === "contacted" || payload.stage === "site_visit" || payload.stage === "negotiation"
      ? now
      : undefined;
  await ref.set(
    deepStripUndefined({
      stage: payload.stage,
      status: resolveStatus(payload.stage, payload.lostReason),
      updatedAt: now,
      lastContactedAt
    }),
    { merge: true }
  );
  return { leadId: input.leadId };
}

export async function addLeadNote(input: {
  tenantId: string;
  user: AuthUser;
  leadId: string;
  body: unknown;
}) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const payload = LeadNoteCreateSchema.parse(input.body);
  const text = payload.text.trim();
  if (!text) throw new Error("Note text required");
  const { ref: leadRef } = await assertTenantLeadExists(input.tenantId, input.leadId);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = leadRef.collection("notes").doc();
  const doc: LeadNoteDoc = {
    id: ref.id,
    leadId: input.leadId,
    tenantId: input.tenantId,
    type: payload.type,
    text,
    createdAt: now,
    createdBy: {
      uid: input.user.uid,
      name: (input.user as any).displayName,
      role: input.user.role
    }
  };
  await ref.set(deepStripUndefined(doc));
  await leadRef.set({ updatedAt: now }, { merge: true });
  return { noteId: ref.id };
}

export async function listLeadNotes(input: { tenantId: string; user: AuthUser; leadId: string }) {
  ensureTenantId(input.user, input.tenantId);
  if (!isLeadAdmin(input.user)) throw new Error("Forbidden");
  const { ref: leadRef } = await assertTenantLeadExists(input.tenantId, input.leadId);
  const ref = leadRef.collection("notes").orderBy("createdAt", "desc");
  const snap = await ref.get();
  return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}
