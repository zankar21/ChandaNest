import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import {
  InventoryCreateSchema,
  InventoryPatchSchema,
  InventoryQuerySchema,
  InventoryStatusPatchSchema
} from "./enterpriseInventory.schemas";

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function inventoryCollection(tenantId: string, enterpriseId: string, projectId: string) {
  return firestore
    .collection("tenants")
    .doc(tenantId)
    .collection("enterprises")
    .doc(enterpriseId)
    .collection("projects")
    .doc(projectId)
    .collection("inventory");
}

export async function createInventoryItem(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
  user: AuthUser;
  body: unknown;
}) {
  const payload = InventoryCreateSchema.parse(input.body);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = inventoryCollection(input.tenantId, input.enterpriseId, input.projectId).doc();
  await ref.set(
    stripUndefined({
      ...payload,
      tenantId: input.tenantId,
      enterpriseId: input.enterpriseId,
      projectId: input.projectId,
      createdAt: now,
      createdBy: input.user.uid,
      updatedAt: now,
      updatedBy: input.user.uid
    })
  );
  return { itemId: ref.id };
}

export async function listInventoryItems(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
  query: unknown;
}) {
  const parsed = InventoryQuerySchema.parse(input.query);
  let ref: FirebaseFirestore.Query = inventoryCollection(
    input.tenantId,
    input.enterpriseId,
    input.projectId
  );
  if (parsed.status) {
    ref = ref.where("status", "==", parsed.status);
  }
  if (parsed.inventoryType) {
    ref = ref.where("inventoryType", "==", parsed.inventoryType);
  }
  const snap = await ref.get();
  return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}

export async function getInventoryItem(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
  itemId: string;
}) {
  const snap = await inventoryCollection(
    input.tenantId,
    input.enterpriseId,
    input.projectId
  )
    .doc(input.itemId)
    .get();
  if (!snap.exists) throw new Error("Not found");
  return { id: snap.id, ...snap.data() };
}

export async function updateInventoryItem(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
  itemId: string;
  user: AuthUser;
  body: unknown;
}) {
  const payload = InventoryPatchSchema.parse(input.body);
  const ref = inventoryCollection(
    input.tenantId,
    input.enterpriseId,
    input.projectId
  ).doc(input.itemId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      ...payload,
      updatedAt: now,
      updatedBy: input.user.uid
    }),
    { merge: true }
  );
  return { itemId: input.itemId };
}

export async function updateInventoryStatus(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
  itemId: string;
  user: AuthUser;
  body: unknown;
}) {
  const payload = InventoryStatusPatchSchema.parse(input.body);
  const ref = inventoryCollection(
    input.tenantId,
    input.enterpriseId,
    input.projectId
  ).doc(input.itemId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Not found");
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set(
    stripUndefined({
      status: payload.status,
      updatedAt: now,
      updatedBy: input.user.uid
    }),
    { merge: true }
  );
  return { itemId: input.itemId, status: payload.status };
}
