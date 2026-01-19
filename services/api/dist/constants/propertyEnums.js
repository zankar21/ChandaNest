"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULTS = exports.AVAILABILITY_STATUS = exports.LAYOUT_APPROVAL_STATUS = exports.NA_STATUS = exports.UNIT_TYPE = exports.PROJECT_STATUS = exports.PROJECT_TYPE = exports.LISTING_DEAL_TYPE = exports.LISTING_TYPE = exports.PROPERTY_TYPE = exports.LISTING_CATEGORY = exports.LISTING_MODE = void 0;
// Listing modes determine whether an item is a standalone property or tied to a project.
exports.LISTING_MODE = ["independent", "project_unit"];
// Legacy categories kept for backward compatibility where needed.
exports.LISTING_CATEGORY = ["residential", "commercial", "land", "other"];
// Property and unit types exposed to clients.
exports.PROPERTY_TYPE = [
    "land",
    "apartment",
    "flat",
    "villa",
    "plot",
    "house",
    "office",
    "shop",
    "warehouse",
    "other"
];
// Legacy listing type (property type) retained for backward compatibility.
exports.LISTING_TYPE = ["apartment", "villa", "plot", "office", "shop", "warehouse", "other"];
// Transaction type for listings (sale / rent / lease).
exports.LISTING_DEAL_TYPE = ["sale", "rent", "lease"];
exports.PROJECT_TYPE = ["plotted", "apartment", "mixed"];
exports.PROJECT_STATUS = ["launching", "under_construction", "ready"];
exports.UNIT_TYPE = ["plot", "flat", "villa"];
exports.NA_STATUS = ["approved", "applied", "agricultural"];
exports.LAYOUT_APPROVAL_STATUS = ["approved", "in_process", "not_approved"];
exports.AVAILABILITY_STATUS = ["available", "hold", "sold"];
exports.DEFAULTS = {
    landType: "plot",
    brokeragePartnerId: "Chandrapur Real Estate Solutions Pvt Ltd"
};
