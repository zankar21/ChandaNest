"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventoryItem = createInventoryItem;
exports.listInventoryItems = listInventoryItems;
exports.getInventoryItem = getInventoryItem;
exports.updateInventoryItem = updateInventoryItem;
exports.updateInventoryStatus = updateInventoryStatus;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const enterpriseInventory_schemas_1 = require("./enterpriseInventory.schemas");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function inventoryCollection(tenantId, enterpriseId, projectId) {
    return firebase_1.firestore
        .collection("tenants")
        .doc(tenantId)
        .collection("enterprises")
        .doc(enterpriseId)
        .collection("projects")
        .doc(projectId)
        .collection("inventory");
}
async function createInventoryItem(input) {
    const payload = enterpriseInventory_schemas_1.InventoryCreateSchema.parse(input.body);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = inventoryCollection(input.tenantId, input.enterpriseId, input.projectId).doc();
    await ref.set(stripUndefined({
        ...payload,
        tenantId: input.tenantId,
        enterpriseId: input.enterpriseId,
        projectId: input.projectId,
        createdAt: now,
        createdBy: input.user.uid,
        updatedAt: now,
        updatedBy: input.user.uid
    }));
    return { itemId: ref.id };
}
async function listInventoryItems(input) {
    const parsed = enterpriseInventory_schemas_1.InventoryQuerySchema.parse(input.query);
    let ref = inventoryCollection(input.tenantId, input.enterpriseId, input.projectId);
    if (parsed.status) {
        ref = ref.where("status", "==", parsed.status);
    }
    if (parsed.inventoryType) {
        ref = ref.where("inventoryType", "==", parsed.inventoryType);
    }
    const snap = await ref.get();
    return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}
async function getInventoryItem(input) {
    const snap = await inventoryCollection(input.tenantId, input.enterpriseId, input.projectId)
        .doc(input.itemId)
        .get();
    if (!snap.exists)
        throw new Error("Not found");
    return { id: snap.id, ...snap.data() };
}
async function updateInventoryItem(input) {
    const payload = enterpriseInventory_schemas_1.InventoryPatchSchema.parse(input.body);
    const ref = inventoryCollection(input.tenantId, input.enterpriseId, input.projectId).doc(input.itemId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        ...payload,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    return { itemId: input.itemId };
}
async function updateInventoryStatus(input) {
    const payload = enterpriseInventory_schemas_1.InventoryStatusPatchSchema.parse(input.body);
    const ref = inventoryCollection(input.tenantId, input.enterpriseId, input.projectId).doc(input.itemId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        status: payload.status,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    return { itemId: input.itemId, status: payload.status };
}
