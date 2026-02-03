"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enumsHandler = enumsHandler;
exports.listingConfigHandler = listingConfigHandler;
const propertyEnums_1 = require("../../constants/propertyEnums");
function enumsHandler(_req, res) {
    res.json({
        ok: true,
        data: {
            listingMode: propertyEnums_1.LISTING_MODE,
            listingType: propertyEnums_1.LISTING_TYPE,
            listingDealType: propertyEnums_1.LISTING_DEAL_TYPE,
            propertyType: propertyEnums_1.PROPERTY_TYPE,
            projectType: propertyEnums_1.PROJECT_TYPE,
            projectStatus: propertyEnums_1.PROJECT_STATUS,
            unitType: propertyEnums_1.UNIT_TYPE,
            naStatus: propertyEnums_1.NA_STATUS,
            layoutApprovalStatus: propertyEnums_1.LAYOUT_APPROVAL_STATUS,
            availability: propertyEnums_1.AVAILABILITY_STATUS
        }
    });
}
function listingConfigHandler(req, res) {
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : null;
    const listingTypes = ["sale", "rent"];
    const propertyTypes = ["plot", "land", "flat"];
    const landTypes = ["agricultural", "na", "farm", "industrial", "open"];
    const areaUnits = ["sqft", "sqm", "acre", "hectare"];
    res.json({
        ok: true,
        data: {
            tenantId,
            listingTypes,
            propertyTypes,
            landTypes,
            listingTypePropertyTypes: {
                sale: ["plot", "land", "flat"],
                rent: ["flat"]
            },
            subTypes: {
                plot: ["residential", "commercial"],
                land: ["agricultural", "na"],
                flat: ["apartment", "builder_floor"]
            },
            areaUnits: {
                plot: areaUnits,
                land: areaUnits,
                flat: areaUnits
            },
            required: {
                publish: {
                    descriptionMin: 30,
                    mediaGalleryMin: 1,
                    saleTotalPrice: true,
                    rentMonthlyRent: true,
                    landRecord: ["mouza", "surveyOrGatNo"]
                }
            }
        }
    });
}
