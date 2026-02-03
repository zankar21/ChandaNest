export type PlanId = "trial" | "starter" | "pro" | "enterprise";

export type PlanDef = {
  id: PlanId;
  listingLimit: number | null;
  publishAllowed: boolean;
  featuredAllowed: boolean;
  featuredLimit: number | null;
  agentSeats: number;
  expiresInDays?: number;
  custom?: boolean;
};

const PLANS: Record<PlanId, PlanDef> = {
  trial: {
    id: "trial",
    listingLimit: 5,
    publishAllowed: true,
    featuredAllowed: false,
    featuredLimit: 0,
    agentSeats: 1,
    expiresInDays: 14
  },
  starter: {
    id: "starter",
    listingLimit: 25,
    publishAllowed: true,
    featuredAllowed: true,
    featuredLimit: 5,
    agentSeats: 3
  },
  pro: {
    id: "pro",
    listingLimit: 200,
    publishAllowed: true,
    featuredAllowed: true,
    featuredLimit: 25,
    agentSeats: 10
  },
  enterprise: {
    id: "enterprise",
    listingLimit: 10000,
    publishAllowed: true,
    featuredAllowed: true,
    featuredLimit: null,
    agentSeats: 100,
    custom: true
  }
};

export function getPlan(planId: PlanId): PlanDef {
  return PLANS[planId];
}

export function defaultPlanForTenantType(type?: string): PlanId {
  if (!type) return "trial";
  if (type === "agency" || type === "enterprise" || type === "builder") {
    return "trial";
  }
  return "trial";
}
