"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlan = getPlan;
exports.defaultPlanForTenantType = defaultPlanForTenantType;
const PLANS = {
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
function getPlan(planId) {
    return PLANS[planId];
}
function defaultPlanForTenantType(type) {
    if (!type)
        return "trial";
    if (type === "agency" || type === "enterprise" || type === "builder") {
        return "trial";
    }
    return "trial";
}
