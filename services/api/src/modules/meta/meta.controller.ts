import admin from "firebase-admin";
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
import { getOrCreateSubscription } from "../billing";
import { TRIAL_PUBLISH_LIMIT } from "../billing/plans";
import { fetchAgentSubscription } from "../agent/agent.subscription.service";
import { countPublishedListingsForUser } from "../properties/properties.service";

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

export async function listingConfigHandler(req: Request, res: Response) {
  const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : null;
  let userId: string | null = null;
  const header = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice("bearer ".length).trim();
    if (token) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        userId = null;
      }
    }
  }
  const listingTypes = ["sale", "rent"];
  const propertyTypes = ["plot", "land", "flat"];
  const landTypes = ["agricultural", "na", "farm", "industrial", "open"];
  const areaUnits = ["sqft", "sqm", "acre", "hectare"];
  let publishLimit: number | null = null;
  let publishRemaining: number | null = null;
  let canPublish = false;
  let planId: string | null = null;
  let isTrial = false;
  let requiresUpgradeReason: string | null = null;
  if (tenantId) {
    const subscription = await getOrCreateSubscription(tenantId);
    planId = subscription.planId;
    if (subscription.limits.publishAllowed) {
      const agentSubscription = userId ? await fetchAgentSubscription(tenantId, userId) : null;
      const agentStatus = agentSubscription?.status || "trial";
      const agentPlan = agentSubscription?.planCode || "trial";
      const agentActive = agentStatus === "active";
      isTrial = !agentActive || agentPlan === "trial";
      if (isTrial) {
        publishLimit = TRIAL_PUBLISH_LIMIT;
        if (userId) {
          const publishedCount = await countPublishedListingsForUser(tenantId, userId);
          publishRemaining = Math.max(0, publishLimit - publishedCount);
          canPublish = publishRemaining > 0;
          if (!canPublish) {
            requiresUpgradeReason = "PLAN_LIMIT_REACHED";
          }
        } else {
          canPublish = true;
        }
      } else {
        canPublish = true;
      }
    } else {
      requiresUpgradeReason = "PUBLISH_NOT_ALLOWED";
    }
  }
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
      },
      capabilities: {
        publish: {
          enabled: Boolean(canPublish),
          limit: publishLimit,
          remaining: publishRemaining,
          planId,
          isTrial,
          requiresUpgradeReason
        }
      }
    }
  });
}
