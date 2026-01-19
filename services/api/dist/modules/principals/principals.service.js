"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPrincipals = getMyPrincipals;
const firebase_1 = require("../../config/firebase");
const logger_1 = require("../../utils/logger");
const principals_schemas_1 = require("./principals.schemas");
const defaultDeps = {
    async fetchMemberships(tenantId, userId) {
        const snap = await firebase_1.firestore
            .collection("memberships")
            .where("tenantId", "==", tenantId)
            .where("userId", "==", userId)
            .where("status", "==", "active")
            .get();
        return snap.docs.map((doc) => doc.data());
    },
    async fetchAgent(tenantId, userId) {
        const ref = firebase_1.firestore.collection("tenants").doc(tenantId).collection("agents").doc(userId);
        const snap = await ref.get();
        if (!snap.exists)
            return null;
        return snap.data();
    },
    async fetchOrgLabel(tenantId, orgType, orgId) {
        try {
            const ref = firebase_1.firestore
                .collection("tenants")
                .doc(tenantId)
                .collection(orgType === "agency" ? "agencies" : "enterprises")
                .doc(orgId);
            const snap = await ref.get();
            if (!snap.exists)
                return null;
            const data = snap.data();
            return data?.name ?? null;
        }
        catch (err) {
            logger_1.logger.warn("Failed to load org label", err);
            return null;
        }
    }
};
async function getMyPrincipals(input, deps = defaultDeps) {
    const { tenantId, user } = input;
    const principals = [];
    const ownerLabel = user.displayName || user.email || "Owner";
    principals.push({
        type: "owner",
        id: user.uid,
        label: ownerLabel,
        role: "owner"
    });
    try {
        const memberships = await deps.fetchMemberships(tenantId, user.uid);
        const labelMap = new Map();
        await Promise.all(memberships.map(async (membership) => {
            if (!membership.orgType || !membership.orgId)
                return;
            const label = await deps.fetchOrgLabel(tenantId, membership.orgType, membership.orgId);
            if (label) {
                labelMap.set(`${membership.orgType}:${membership.orgId}`, label);
            }
        }));
        memberships.forEach((membership) => {
            if (membership.orgType === "agency" && membership.orgId) {
                principals.push({
                    type: "agency",
                    id: membership.orgId,
                    label: labelMap.get(`agency:${membership.orgId}`) || "Agency",
                    role: membership.role,
                    orgType: "agency",
                    orgId: membership.orgId
                });
            }
            if (membership.orgType === "enterprise" && membership.orgId) {
                principals.push({
                    type: "enterprise",
                    id: membership.orgId,
                    label: labelMap.get(`enterprise:${membership.orgId}`) || "Enterprise",
                    role: membership.role,
                    orgType: "enterprise",
                    orgId: membership.orgId
                });
            }
        });
    }
    catch (err) {
        logger_1.logger.warn("Failed to load memberships for principals", err);
    }
    try {
        const agentDoc = await deps.fetchAgent(tenantId, user.uid);
        if (agentDoc) {
            principals.push({
                type: "agent",
                id: user.uid,
                label: agentDoc.name || "Agent",
                role: "agent_admin"
            });
        }
    }
    catch (err) {
        logger_1.logger.warn("Failed to load agent principal", err);
    }
    return principals_schemas_1.PrincipalScopeResponseSchema.parse({
        ok: true,
        tenantId,
        principals
    });
}
