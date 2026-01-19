"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseRoles = exports.AgencyRoles = void 0;
exports.hasPermission = hasPermission;
exports.AgencyRoles = [
    "agency_admin",
    "agency_manager",
    "agency_agent",
    "agency_crm",
    "agency_media",
    "agency_analyst"
];
exports.EnterpriseRoles = [
    "enterprise_admin",
    "enterprise_project_manager",
    "enterprise_listing_manager",
    "enterprise_sales",
    "enterprise_compliance",
    "enterprise_analyst"
];
const ROLE_PERMISSIONS = {
    agency_admin: [
        "org.manage",
        "members.manage",
        "org.read",
        "members.read",
        "leads.read",
        "leads.manage",
        "leads.assign",
        "mandates.request",
        "mandates.read",
        "orgDocs.read",
        "orgDocs.manage",
        "orgVerification.read"
    ],
    agency_manager: [
        "org.read",
        "members.read",
        "leads.read",
        "leads.manage",
        "leads.assign",
        "mandates.request",
        "mandates.read",
        "orgDocs.read",
        "orgDocs.manage",
        "orgVerification.read"
    ],
    agency_agent: [
        "org.read",
        "leads.read",
        "leads.manage",
        "mandates.request",
        "mandates.read",
        "orgDocs.read"
    ],
    agency_crm: ["org.read", "leads.read", "leads.manage"],
    agency_media: ["org.read"],
    agency_analyst: ["org.read"],
    enterprise_admin: [
        "org.manage",
        "members.manage",
        "org.read",
        "members.read",
        "leads.read",
        "leads.manage",
        "leads.assign",
        "enterprise.projects.read",
        "enterprise.projects.manage",
        "enterprise.inventory.read",
        "enterprise.inventory.manage",
        "orgDocs.read",
        "orgDocs.manage",
        "orgVerification.read",
        "orgVerification.decide"
    ],
    enterprise_project_manager: [
        "org.read",
        "enterprise.projects.read",
        "enterprise.projects.manage",
        "enterprise.inventory.read",
        "enterprise.inventory.manage",
        "orgDocs.read",
        "orgDocs.manage",
        "orgVerification.read"
    ],
    enterprise_listing_manager: [
        "org.read",
        "leads.read",
        "leads.manage",
        "leads.assign",
        "enterprise.projects.read",
        "enterprise.inventory.read",
        "enterprise.inventory.manage",
        "orgDocs.read"
    ],
    enterprise_sales: ["org.read", "leads.read", "leads.manage", "enterprise.projects.read", "enterprise.inventory.read"],
    enterprise_compliance: ["org.read", "orgDocs.read", "orgVerification.decide"],
    enterprise_analyst: ["org.read", "enterprise.projects.read", "enterprise.inventory.read"]
};
function hasPermission(role, permission) {
    if (!role)
        return false;
    return (ROLE_PERMISSIONS[role] || []).includes(permission);
}
