import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { ProjectCreateSchema, ProjectPatchSchema } from "./enterpriseProjects.schemas";

function stripUndefined<T extends Record<string, any>>(input: T) {
  const output: Record<string, any> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) output[key] = value;
  });
  return output;
}

function projectsCollection(tenantId: string, enterpriseId: string) {
  return firestore
    .collection("tenants")
    .doc(tenantId)
    .collection("enterprises")
    .doc(enterpriseId)
    .collection("projects");
}

export async function createEnterpriseProject(input: {
  tenantId: string;
  enterpriseId: string;
  user: AuthUser;
  body: unknown;
}) {
  const payload = ProjectCreateSchema.parse(input.body);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = projectsCollection(input.tenantId, input.enterpriseId).doc();
  await ref.set(
    stripUndefined({
      ...payload,
      tenantId: input.tenantId,
      enterpriseId: input.enterpriseId,
      createdAt: now,
      createdBy: input.user.uid,
      updatedAt: now,
      updatedBy: input.user.uid
    })
  );
  return { projectId: ref.id };
}

export async function listEnterpriseProjects(input: { tenantId: string; enterpriseId: string }) {
  const snap = await projectsCollection(input.tenantId, input.enterpriseId).get();
  return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}

export async function getEnterpriseProject(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
}) {
  const snap = await projectsCollection(input.tenantId, input.enterpriseId).doc(input.projectId).get();
  if (!snap.exists) throw new Error("Not found");
  return { id: snap.id, ...snap.data() };
}

export async function updateEnterpriseProject(input: {
  tenantId: string;
  enterpriseId: string;
  projectId: string;
  user: AuthUser;
  body: unknown;
}) {
  const payload = ProjectPatchSchema.parse(input.body);
  const ref = projectsCollection(input.tenantId, input.enterpriseId).doc(input.projectId);
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
  return { projectId: input.projectId };
}
