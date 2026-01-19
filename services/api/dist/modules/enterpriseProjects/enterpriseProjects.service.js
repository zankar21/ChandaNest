"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnterpriseProject = createEnterpriseProject;
exports.listEnterpriseProjects = listEnterpriseProjects;
exports.getEnterpriseProject = getEnterpriseProject;
exports.updateEnterpriseProject = updateEnterpriseProject;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const firebase_1 = require("../../config/firebase");
const enterpriseProjects_schemas_1 = require("./enterpriseProjects.schemas");
function stripUndefined(input) {
    const output = {};
    Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined)
            output[key] = value;
    });
    return output;
}
function projectsCollection(tenantId, enterpriseId) {
    return firebase_1.firestore
        .collection("tenants")
        .doc(tenantId)
        .collection("enterprises")
        .doc(enterpriseId)
        .collection("projects");
}
async function createEnterpriseProject(input) {
    const payload = enterpriseProjects_schemas_1.ProjectCreateSchema.parse(input.body);
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    const ref = projectsCollection(input.tenantId, input.enterpriseId).doc();
    await ref.set(stripUndefined({
        ...payload,
        tenantId: input.tenantId,
        enterpriseId: input.enterpriseId,
        createdAt: now,
        createdBy: input.user.uid,
        updatedAt: now,
        updatedBy: input.user.uid
    }));
    return { projectId: ref.id };
}
async function listEnterpriseProjects(input) {
    const snap = await projectsCollection(input.tenantId, input.enterpriseId).get();
    return { items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
}
async function getEnterpriseProject(input) {
    const snap = await projectsCollection(input.tenantId, input.enterpriseId).doc(input.projectId).get();
    if (!snap.exists)
        throw new Error("Not found");
    return { id: snap.id, ...snap.data() };
}
async function updateEnterpriseProject(input) {
    const payload = enterpriseProjects_schemas_1.ProjectPatchSchema.parse(input.body);
    const ref = projectsCollection(input.tenantId, input.enterpriseId).doc(input.projectId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Not found");
    const now = firebase_admin_1.default.firestore.FieldValue.serverTimestamp();
    await ref.set(stripUndefined({
        ...payload,
        updatedAt: now,
        updatedBy: input.user.uid
    }), { merge: true });
    return { projectId: input.projectId };
}
