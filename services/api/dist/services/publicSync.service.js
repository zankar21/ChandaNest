"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertPublicProperty = upsertPublicProperty;
exports.removePublicProperty = removePublicProperty;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
function deepStripUndefined(value) {
    if (value && typeof value === "object" && "_methodName" in value) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(deepStripUndefined).filter((item) => item !== undefined);
    }
    if (value && typeof value === "object") {
        const result = {};
        Object.entries(value).forEach(([key, val]) => {
            const cleaned = deepStripUndefined(val);
            if (cleaned !== undefined) {
                result[key] = cleaned;
            }
        });
        return Object.keys(result).length ? result : undefined;
    }
    return value === undefined ? undefined : value;
}
async function upsertPublicProperty(propertyId, payload) {
    const cleanup = {
        galleryUrls: firebase_admin_1.default.firestore.FieldValue.delete(),
        heroUrl: firebase_admin_1.default.firestore.FieldValue.delete(),
        downloadToken: firebase_admin_1.default.firestore.FieldValue.delete()
    };
    const cleaned = deepStripUndefined(payload) || {};
    await firebase_1.firestore
        .collection("publicProperties")
        .doc(propertyId)
        .set({ ...cleanup, ...cleaned }, { merge: true });
    logger_1.logger.info("Public property upserted", { propertyId, mediaCount: payload?.media?.gallery?.length ?? 0 });
}
async function removePublicProperty(propertyId) {
    await firebase_1.firestore.collection("publicProperties").doc(propertyId).delete();
    logger_1.logger.info("Public property removed", { propertyId });
}
