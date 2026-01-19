"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBuyerRequestPublic = createBuyerRequestPublic;
exports.listBuyerRequests = listBuyerRequests;
exports.getBuyerRequest = getBuyerRequest;
exports.updateBuyerRequest = updateBuyerRequest;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const market_1 = require("../../constants/market");
const propertyEnums_1 = require("../../constants/propertyEnums");
function getTenantIdForPublic() {
    if (env_1.env.publicDefaultTenantId)
        return env_1.env.publicDefaultTenantId;
    if (env_1.env.platformTenantId)
        return env_1.env.platformTenantId;
    throw new Error("PUBLIC_DEFAULT_TENANT_ID is not configured");
}
function buyerRequestsCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("buyerRequests");
}
async function createBuyerRequestPublic(input) {
    const tenantId = getTenantIdForPublic();
    const col = buyerRequestsCollection(tenantId);
    const ref = col.doc();
    const requestId = ref.id;
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const consentAt = input.consent.at instanceof Date
        ? input.consent.at
        : typeof input.consent.at === "number"
            ? new Date(input.consent.at)
            : input.consent.at
                ? new Date(input.consent.at)
                : new Date();
    const propertyType = input.property.category === "land" ? input.property.type ?? propertyEnums_1.DEFAULTS.landType : input.property.type;
    const doc = {
        tenantId,
        requestId,
        createdAt: now,
        updatedAt: now,
        status: "created",
        partner: market_1.FIXED_PARTNER,
        citySlug: input.citySlug,
        intent: input.intent,
        property: {
            category: input.property.category,
            type: propertyType ?? propertyEnums_1.DEFAULTS.landType,
            bhk: input.property.bhk
        },
        budget: input.budget,
        localityText: input.localityText,
        mustHaves: input.mustHaves ?? [],
        dealBreakers: input.dealBreakers ?? [],
        consent: {
            ...input.consent,
            at: consentAt
        },
        buyer: {
            name: input.buyer.name,
            phone: input.buyer.phone,
            preferredCallTime: input.buyer.preferredCallTime
        }
    };
    await ref.set(doc);
    return { requestId };
}
async function listBuyerRequests(user, tenantId, query) {
    if (user.tenantId !== tenantId)
        throw new Error("Forbidden");
    let ref = buyerRequestsCollection(tenantId);
    if (query.status)
        ref = ref.where("status", "==", query.status);
    if (query.citySlug)
        ref = ref.where("citySlug", "==", query.citySlug);
    ref = ref.orderBy("createdAt", "desc").limit(query.limit ?? 50);
    const snap = await ref.get();
    const items = snap.docs.map((d) => d.data());
    return { items };
}
async function getBuyerRequest(user, tenantId, requestId) {
    if (user.tenantId !== tenantId)
        throw new Error("Forbidden");
    const ref = buyerRequestsCollection(tenantId).doc(requestId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    return snap.data();
}
async function updateBuyerRequest(user, tenantId, requestId, body) {
    if (user.tenantId !== tenantId)
        throw new Error("Forbidden");
    const ref = buyerRequestsCollection(tenantId).doc(requestId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const update = {
        updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
    };
    if (body.status)
        update.status = body.status;
    if (body.notes !== undefined)
        update.notes = body.notes;
    await ref.set(update, { merge: true });
    return { requestId };
}
