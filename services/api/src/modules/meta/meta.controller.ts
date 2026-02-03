import { Request, Response } from "express";
import {
  AVAILABILITY_STATUS,
  LAYOUT_APPROVAL_STATUS,
  LISTING_MODE,
  LISTING_TYPE,
  LISTING_DEAL_TYPE,
  NA_STATUS,
  PROJECT_STATUS,
  PROJECT_TYPE,
  PROPERTY_TYPE,
  UNIT_TYPE
} from "../../constants/propertyEnums";

export function enumsHandler(_req: Request, res: Response) {
  res.json({
    ok: true,
    data: {
      listingMode: LISTING_MODE,
      listingType: LISTING_TYPE,
      listingDealType: LISTING_DEAL_TYPE,
      propertyType: PROPERTY_TYPE,
      projectType: PROJECT_TYPE,
      projectStatus: PROJECT_STATUS,
      unitType: UNIT_TYPE,
      naStatus: NA_STATUS,
      layoutApprovalStatus: LAYOUT_APPROVAL_STATUS,
      availability: AVAILABILITY_STATUS
    }
  });
}

export function listingConfigHandler(req: Request, res: Response) {
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
