export const PLAN_IDS = ["owner", "agent", "small_agency", "big_agency", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
