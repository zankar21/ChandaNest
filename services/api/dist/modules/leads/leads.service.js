"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAccessLead = canAccessLead;
exports.createPublicLead = createPublicLead;
exports.listLeads = listLeads;
exports.getLead = getLead;
exports.assignLead = assignLead;
exports.addLeadActivity = addLeadActivity;
exports.updateLeadStatus = updateLeadStatus;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const memberships_service_1 = require("../memberships/memberships.service");
const permissions_1 = require("../memberships/permissions");
const leads_schemas_1 = require("./leads.schemas");
const defaultDeps = {
    async fetchOrgListing(tenantId, listingId) {
        const snap = await firebase_1.firestore
            .collection("tenants")
            .doc(tenantId)
            .collection("orgListings")
            .doc(listingId)
            .get();
        if (!snap.exists)
            return null;
        return snap.data();
    },
    async fetchPublicProperty(listingId) {
        const snap = await firebase_1.firestore.collection("publicProperties").doc(listingId).get();
        if (!snap.exists)
            return null;
        return snap.data();
    },
    async fetchOwnerListing(tenantId, listingId) {
        const ref = firebase_1.firestore.collection("tenants").doc(tenantId).collection("listings").doc(listingId);
        const snap = await ref.get();
        if (snap.exists)
            return snap.data();
        const platformRef = firebase_1.firestore
            .collection("tenants")
            .doc(env_1.env.platformTenantId)
            .collection("listings")
            .doc(listingId);
        const platformSnap = await platformRef.get();
        if (!platformSnap.exists)
            return null;
        return platformSnap.data();
    },
    async createLeadDoc(tenantId, doc) {
        const ref = firebase_1.firestore.collection("tenants").doc(tenantId).collection("leads").doc();
        await ref.set({ ...doc, id: ref.id });
        return ref.id;
    }
};
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function normalizePhone(value) {
    return value.replace(/[^0-9]/g, "");
}
function canAccessLead(input) {
    const { user, lead, memberships, permission } = input;
    if (lead.principalType === "owner" && lead.principalId === user.uid) {
        return permission !== "leads.assign";
    }
    if (lead.principalType === "agent" && lead.principalId === user.uid) {
        return true;
    }
    const match = memberships.find((member) => member.orgType === lead.principalType && member.orgId === lead.principalId);
    if (!match)
        return false;
    return (0, permissions_1.hasPermission)(match.role, permission);
}
async function createPublicLead(input, deps = defaultDeps) {
    const payload = leads_schemas_1.PublicLeadCreateSchema.parse(input.body);
    const phone = normalizePhone(payload.phone);
    if (phone.length < 10 || phone.length > 15) {
        throw new Error("Invalid phone number");
    }
    let principalType;
    let principalId;
    if (payload.listingSource === "org") {
        const listing = await deps.fetchOrgListing(payload.tenantId, payload.listingId);
        if (!listing || listing.lifecycleState !== "published" || listing.visibility !== "public") {
            throw new Error("Listing not available");
        }
        principalType = listing.principalType;
        principalId = listing.principalId;
    }
    else {
        const publicProperty = await deps.fetchPublicProperty(payload.listingId);
        if (!publicProperty || publicProperty.tenantId !== payload.tenantId) {
            throw new Error("Listing not available");
        }
        const ownerListing = await deps.fetchOwnerListing(payload.tenantId, payload.listingId);
        if (!ownerListing) {
            throw new Error("Listing not available");
        }
        principalType = "owner";
        principalId = ownerListing.createdBy?.uid || ownerListing.ownerId || "";
        if (!principalId) {
            throw new Error("Listing not available");
        }
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const doc = {
        id: "pending",
        tenantId: payload.tenantId,
        listingSource: payload.listingSource,
        listingId: payload.listingId,
        principalType,
        principalId,
        status: "new",
        contact: {
            name: payload.name.trim(),
            phone,
            ...(payload.email ? { email: payload.email } : {})
        },
        message: payload.message?.trim() || undefined,
        createdAt: now,
        createdBy: "public",
        sourceMeta: stripUndefined({
            userAgent: input.meta?.userAgent,
            ip: input.meta?.ip,
            pageUrl: payload.pageUrl
        })
    };
    const leadId = await deps.createLeadDoc(payload.tenantId, doc);
    return { leadId };
}
async function listLeads(input) {
    const queryParsed = leads_schemas_1.LeadQuerySchema.parse(input.query);
    const leadsCollection = firebase_1.firestore.collection("tenants").doc(input.tenantId).collection("leads");
    if (input.user.role === "tenant_admin" || input.user.role === "platform_admin") {
        let ref = leadsCollection;
        if (queryParsed.status)
            ref = ref.where("status", "==", queryParsed.status);
        if (queryParsed.listingSource)
            ref = ref.where("listingSource", "==", queryParsed.listingSource);
        if (queryParsed.principalType)
            ref = ref.where("principalType", "==", queryParsed.principalType);
        if (queryParsed.principalId)
            ref = ref.where("principalId", "==", queryParsed.principalId);
        const snap = await ref.orderBy("createdAt", "desc").limit(queryParsed.limit || 50).get();
        return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
    }
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    const items = [];
    const seen = new Set();
    const fetches = [];
    const addDocs = (snap) => {
        snap.docs.forEach((doc) => {
            if (seen.has(doc.id))
                return;
            seen.add(doc.id);
            items.push({ id: doc.id, ...doc.data() });
        });
    };
    const principalFilters = [];
    principalFilters.push({ type: "agent", id: input.user.uid });
    principalFilters.push({ type: "owner", id: input.user.uid });
    memberships.forEach((member) => {
        if (member.orgType && member.orgId && (0, permissions_1.hasPermission)(member.role, "leads.read")) {
            principalFilters.push({ type: member.orgType, id: member.orgId });
        }
    });
    principalFilters.forEach((principal) => {
        if (queryParsed.principalType && queryParsed.principalType !== principal.type)
            return;
        if (queryParsed.principalId && queryParsed.principalId !== principal.id)
            return;
        let ref = leadsCollection
            .where("principalType", "==", principal.type)
            .where("principalId", "==", principal.id);
        if (queryParsed.status)
            ref = ref.where("status", "==", queryParsed.status);
        if (queryParsed.listingSource)
            ref = ref.where("listingSource", "==", queryParsed.listingSource);
        fetches.push(ref.orderBy("createdAt", "desc").limit(queryParsed.limit || 50).get().then(addDocs));
    });
    await Promise.all(fetches);
    return { items };
}
async function getLead(input) {
    const ref = firebase_1.firestore.collection("tenants").doc(input.tenantId).collection("leads").doc(input.leadId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const lead = snap.data();
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    if (!canAccessLead({
        user: input.user,
        lead,
        memberships,
        permission: "leads.read"
    })) {
        throw new Error("Forbidden");
    }
    return { ...lead, id: snap.id };
}
async function appendActivity(input) {
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = firebase_1.firestore
        .collection("tenants")
        .doc(input.tenantId)
        .collection("leads")
        .doc(input.leadId)
        .collection("activity")
        .doc();
    await ref.set(stripUndefined({
        type: input.type,
        note: input.note,
        by: {
            uid: input.by.uid,
            name: input.by.displayName,
            role: input.by.role
        },
        at: now
    }));
    await firebase_1.firestore
        .collection("tenants")
        .doc(input.tenantId)
        .collection("leads")
        .doc(input.leadId)
        .set({ lastActivityAt: now }, { merge: true });
}
async function assignLead(input) {
    const payload = leads_schemas_1.LeadAssignSchema.parse(input.body);
    const ref = firebase_1.firestore.collection("tenants").doc(input.tenantId).collection("leads").doc(input.leadId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const lead = snap.data();
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    if (!canAccessLead({
        user: input.user,
        lead,
        memberships,
        permission: "leads.assign"
    })) {
        throw new Error("Forbidden");
    }
    if (lead.principalType === "agent" && payload.userId !== input.user.uid) {
        throw new Error("Forbidden");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        assignedTo: {
            userId: payload.userId,
            at: now,
            by: input.user.uid
        }
    }), { merge: true });
    await appendActivity({
        tenantId: input.tenantId,
        leadId: input.leadId,
        type: "assignment",
        note: `Assigned to ${payload.userId}`,
        by: input.user
    });
    return { leadId: input.leadId };
}
async function addLeadActivity(input) {
    const payload = leads_schemas_1.LeadActivityCreateSchema.parse(input.body);
    const ref = firebase_1.firestore.collection("tenants").doc(input.tenantId).collection("leads").doc(input.leadId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const lead = snap.data();
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    if (!canAccessLead({
        user: input.user,
        lead,
        memberships,
        permission: "leads.manage"
    })) {
        throw new Error("Forbidden");
    }
    await appendActivity({
        tenantId: input.tenantId,
        leadId: input.leadId,
        type: payload.type,
        note: payload.note,
        by: input.user
    });
    return { leadId: input.leadId };
}
async function updateLeadStatus(input) {
    const payload = leads_schemas_1.LeadStatusUpdateSchema.parse(input.body);
    const ref = firebase_1.firestore.collection("tenants").doc(input.tenantId).collection("leads").doc(input.leadId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const lead = snap.data();
    const memberships = await (0, memberships_service_1.listMembershipsByUser)({
        tenantId: input.tenantId,
        userId: input.user.uid
    });
    if (!canAccessLead({
        user: input.user,
        lead,
        memberships,
        permission: "leads.manage"
    })) {
        throw new Error("Forbidden");
    }
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        status: payload.status,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    await appendActivity({
        tenantId: input.tenantId,
        leadId: input.leadId,
        type: "status_change",
        note: payload.status,
        by: input.user
    });
    return { leadId: input.leadId, status: payload.status };
}
