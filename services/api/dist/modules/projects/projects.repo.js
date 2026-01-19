"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsCollection = projectsCollection;
const firebase_1 = require("../../config/firebase");
function projectsCollection(tenantId) {
    return firebase_1.firestore.collection("tenants").doc(tenantId).collection("projects");
}
