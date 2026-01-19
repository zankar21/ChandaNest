"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isActiveMembership = isActiveMembership;
exports.requireTenantAdmin = requireTenantAdmin;
exports.requireOrgMembership = requireOrgMembership;
exports.requirePermission = requirePermission;
const firebase_1 = require("../../config/firebase");
const permissions_1 = require("./permissions");
function forbidden(res, message = "Forbidden") {
    return res.status(403).json({ ok: false, error: { message, code: "FORBIDDEN" } });
}
function isActiveMembership(member) {
    return member?.status === "active";
}
function requireTenantAdmin(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
    }
    if (user.role !== "tenant_admin" && user.role !== "platform_admin") {
        return forbidden(res);
    }
    next();
}
function requireOrgMembership(orgType, orgIdParam) {
    return async (req, res, next) => {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
        }
        const tenantId = req.params.tenantId;
        const orgId = req.params[orgIdParam];
        const snap = await firebase_1.firestore
            .collection("tenants")
            .doc(tenantId)
            .collection("memberships")
            .where("orgType", "==", orgType)
            .where("orgId", "==", orgId)
            .where("userId", "==", user.uid)
            .where("status", "==", "active")
            .limit(1)
            .get();
        if (snap.empty) {
            return forbidden(res);
        }
        const member = snap.docs[0].data();
        if (!isActiveMembership(member)) {
            return forbidden(res);
        }
        req.orgMembership = { id: snap.docs[0].id, ...member };
        next();
    };
}
function requirePermission(permission) {
    return (req, res, next) => {
        const membership = req.orgMembership;
        if (!membership || !(0, permissions_1.hasPermission)(membership.role, permission)) {
            return forbidden(res);
        }
        next();
    };
}
