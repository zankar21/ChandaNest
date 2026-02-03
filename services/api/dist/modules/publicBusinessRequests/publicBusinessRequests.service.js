"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBusinessRequest = createBusinessRequest;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const env_1 = require("../../config/env");
const rateLimit_1 = require("../../utils/rateLimit");
function stripUndefined(input) {
    return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
async function createBusinessRequest(input, meta) {
    const ipHash = meta.ip ? (0, rateLimit_1.hashIp)(meta.ip, env_1.env.ipHashSalt) : undefined;
    if (ipHash && (0, rateLimit_1.isRateLimited)(ipHash, 5, 60 * 60 * 1000)) {
        throw new Error("RATE_LIMITED");
    }
    const ref = firebase_1.firestore.collection("business_requests").doc();
    const requestId = ref.id;
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const doc = stripUndefined({
        status: "pending",
        businessType: input.businessType,
        organizationName: input.organizationName,
        contactPerson: input.contactPerson,
        email: input.email,
        phone: input.phone,
        city: input.city,
        gstNumber: input.gstNumber,
        website: input.website,
        expectedListings: input.expectedListings,
        message: input.message,
        source: "web-public",
        userAgent: meta.userAgent ? meta.userAgent.slice(0, 200) : undefined,
        ipHash,
        submittedAt: now
    });
    await ref.set(doc);
    return { requestId };
}
