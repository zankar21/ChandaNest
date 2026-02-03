"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasOrgListingPermission = hasOrgListingPermission;
const ROLE_PERMISSIONS = {
    agency_admin: [
        "orgListing.create",
        "orgListing.edit",
        "orgListing.submit",
        "orgListing.approve",
        "orgListing.publish",
        "orgListing.unpublish",
        "orgListing.archive",
        "orgListing.read"
    ],
    agency_manager: [
        "orgListing.read",
        "orgListing.edit",
        "orgListing.submit",
        "orgListing.approve"
    ],
    agency_agent: [
        "orgListing.read",
        "orgListing.create",
        "orgListing.edit",
        "orgListing.submit"
    ],
    agency_crm: ["orgListing.read"],
    agency_media: ["orgListing.read"],
    agency_analyst: ["orgListing.read"],
    enterprise_admin: [
        "orgListing.create",
        "orgListing.edit",
        "orgListing.submit",
        "orgListing.approve",
        "orgListing.publish",
        "orgListing.unpublish",
        "orgListing.archive",
        "orgListing.read"
    ],
    enterprise_listing_manager: [
        "orgListing.read",
        "orgListing.create",
        "orgListing.edit",
        "orgListing.submit",
        "orgListing.publish",
        "orgListing.unpublish"
    ],
    enterprise_compliance: ["orgListing.read", "orgListing.approve"],
    enterprise_sales: ["orgListing.read"],
    enterprise_project_manager: ["orgListing.read"],
    enterprise_analyst: ["orgListing.read"]
};
function hasOrgListingPermission(role, permission) {
    if (!role)
        return false;
    return (ROLE_PERMISSIONS[role] || []).includes(permission);
}
