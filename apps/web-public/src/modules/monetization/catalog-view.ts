import type { MonetizationCatalogProduct } from "../../services/apiClient";

export type PricingCardView = {
  productId: string;
  title: string;
  priceLabel: string;
  subtitle: string;
  badge?: string;
  meta?: string;
};

const PRODUCT_LABELS: Record<string, string> = {
  owner_boost_7d_v1: "Boost Listing",
  owner_premium_boost_30d_v1: "Premium Boost",
  agent_listing_basic_30d_v1: "Basic Listing",
  agent_listing_premium_45d_v1: "Premium Listing",
  agent_listing_featured_60d_v1: "Featured Listing",
  agent_featured_autorenew_weekly_v1: "Featured Auto-Renew",
  agent_subscription_starter_m_v1: "Starter Monthly",
  agent_subscription_professional_m_v1: "Professional Monthly",
  agent_subscription_promax_m_v1: "ProMax Monthly",
  agent_credit_pack_10_v1: "10 Listing Credits",
  agent_credit_pack_40_v1: "40 Listing Credits",
  agent_credit_pack_120_v1: "120 Listing Credits",
  builder_subscription_starter_m_v1: "Starter Builder",
  builder_subscription_growth_m_v1: "Growth Builder",
  builder_subscription_enterprise_m_v1: "Enterprise Builder",
  builder_project_spotlight_m_v1: "Project Spotlight",
  builder_unit_boost_weekly_v1: "Unit Boost"
};

export function formatCatalogPrice(product?: MonetizationCatalogProduct | null) {
  if (!product) return "Price unavailable";

  const amount = Number(product.price?.amount || 0);
  const currency = product.price?.currency || "INR";

  const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);

  if (product.billingCycle === "weekly") return `${money} / week`;
  if (product.billingCycle === "monthly") return `${money} / month`;
  if (product.billingCycle === "yearly") return `${money} / year`;
  if (product.durationDays) return `${money} / ${product.durationDays} days`;

  return money;
}

export function getProductLabel(product?: MonetizationCatalogProduct | null) {
  if (!product) return "Plan";
  return PRODUCT_LABELS[product.productId] || product.productId;
}

export function indexCatalogProducts(items: MonetizationCatalogProduct[] = []) {
  return new Map(items.map((item) => [item.productId, item]));
}

export function getProduct(items: MonetizationCatalogProduct[] = [], productId: string) {
  return items.find((item) => item.productId === productId) || null;
}

export function buildPricingCard(product?: MonetizationCatalogProduct | null): PricingCardView | null {
  if (!product) return null;

  const limits = product.limits || {};
  let subtitle = "Platform visibility and enquiry access";
  let meta: string | undefined;

  if (product.productType === "boost") {
    subtitle = product.features?.homepageFeature
      ? "Top placement and homepage visibility"
      : "Highlighted listing visibility";
  } else if (product.productType === "listing_access") {
    if (product.productId === "agent_listing_basic_30d_v1") {
      subtitle = "Standard search visibility";
    } else if (product.productId === "agent_listing_premium_45d_v1") {
      subtitle = "Higher visibility with stronger ranking";
    } else if (product.productId === "agent_listing_featured_60d_v1") {
      subtitle = "Maximum visibility with premium placement";
    } else {
      subtitle = "Listing visibility and enquiry delivery";
    }
  } else if (product.productType === "subscription") {
    const activeListings = limits.activeListings ?? limits.projects ?? null;
    const units = limits.units ?? null;

    if (activeListings == null && units == null) {
      subtitle = "Unlimited active inventory";
    } else if (units != null) {
      subtitle = `${activeListings ?? 0} project${activeListings === 1 ? "" : "s"} and ${units} units`;
    } else {
      subtitle = `${activeListings ?? 0} active listing${activeListings === 1 ? "" : "s"}`;
    }
  } else if (product.productType === "agent_listing_credit_pack") {
    subtitle = `${limits.listingCredits ?? 0} publishes from wallet credits`;
    meta = product.durationDays ? `Valid for ${Math.round(product.durationDays / 30)} months` : undefined;
  } else if (product.productType === "recurring_feature_visibility") {
    subtitle = "Keeps featured visibility active every week";
  }

  return {
    productId: product.productId,
    title: getProductLabel(product),
    priceLabel: formatCatalogPrice(product),
    subtitle,
    badge: product.billingType === "recurring" ? "Recurring" : "One-time",
    meta
  };
}

export function buildFallbackCatalog(role: "owner" | "agent" | "builder") {
  const items: MonetizationCatalogProduct[] = [];

  if (role === "owner") {
    items.push(
      {
        productId: "owner_boost_7d_v1",
        version: 1,
        isActive: true,
        productType: "boost",
        billingType: "one_time",
        appliesToRole: "owner",
        entitlementScope: "listing",
        price: { amount: 199, currency: "INR" },
        durationDays: 7
      },
      {
        productId: "owner_premium_boost_30d_v1",
        version: 1,
        isActive: true,
        productType: "boost",
        billingType: "one_time",
        appliesToRole: "owner",
        entitlementScope: "listing",
        price: { amount: 499, currency: "INR" },
        durationDays: 30,
        features: { homepageFeature: true }
      }
    );
  }

  if (role === "agent") {
    items.push(
      {
        productId: "agent_listing_basic_30d_v1",
        version: 1,
        isActive: true,
        productType: "listing_access",
        billingType: "one_time",
        appliesToRole: "agent",
        entitlementScope: "listing",
        price: { amount: 499, currency: "INR" },
        durationDays: 30
      },
      {
        productId: "agent_listing_premium_45d_v1",
        version: 1,
        isActive: true,
        productType: "listing_access",
        billingType: "one_time",
        appliesToRole: "agent",
        entitlementScope: "listing",
        price: { amount: 1499, currency: "INR" },
        durationDays: 45
      },
      {
        productId: "agent_listing_featured_60d_v1",
        version: 1,
        isActive: true,
        productType: "listing_access",
        billingType: "one_time",
        appliesToRole: "agent",
        entitlementScope: "listing",
        price: { amount: 2999, currency: "INR" },
        durationDays: 60
      },
      {
        productId: "agent_subscription_starter_m_v1",
        version: 1,
        isActive: true,
        productType: "subscription",
        billingType: "recurring",
        appliesToRole: "agent",
        entitlementScope: "tenant",
        price: { amount: 2999, currency: "INR" },
        billingCycle: "monthly",
        limits: { activeListings: 10 }
      },
      {
        productId: "agent_subscription_professional_m_v1",
        version: 1,
        isActive: true,
        productType: "subscription",
        billingType: "recurring",
        appliesToRole: "agent",
        entitlementScope: "tenant",
        price: { amount: 7999, currency: "INR" },
        billingCycle: "monthly",
        limits: { activeListings: 50 }
      },
      {
        productId: "agent_subscription_promax_m_v1",
        version: 1,
        isActive: true,
        productType: "subscription",
        billingType: "recurring",
        appliesToRole: "agent",
        entitlementScope: "tenant",
        price: { amount: 14999, currency: "INR" },
        billingCycle: "monthly",
        limits: { activeListings: null }
      },
      {
        productId: "agent_credit_pack_10_v1",
        version: 1,
        isActive: true,
        productType: "agent_listing_credit_pack",
        billingType: "one_time",
        appliesToRole: "agent",
        entitlementScope: "wallet",
        price: { amount: 2999, currency: "INR" },
        durationDays: 180,
        limits: { listingCredits: 10 }
      },
      {
        productId: "agent_credit_pack_40_v1",
        version: 1,
        isActive: true,
        productType: "agent_listing_credit_pack",
        billingType: "one_time",
        appliesToRole: "agent",
        entitlementScope: "wallet",
        price: { amount: 9999, currency: "INR" },
        durationDays: 180,
        limits: { listingCredits: 40 }
      },
      {
        productId: "agent_credit_pack_120_v1",
        version: 1,
        isActive: true,
        productType: "agent_listing_credit_pack",
        billingType: "one_time",
        appliesToRole: "agent",
        entitlementScope: "wallet",
        price: { amount: 24999, currency: "INR" },
        durationDays: 180,
        limits: { listingCredits: 120 }
      },
      {
        productId: "agent_featured_autorenew_weekly_v1",
        version: 1,
        isActive: true,
        productType: "recurring_feature_visibility",
        billingType: "recurring",
        appliesToRole: "agent",
        entitlementScope: "listing",
        price: { amount: 299, currency: "INR" },
        durationDays: 7,
        billingCycle: "weekly"
      }
    );
  }

  if (role === "builder") {
    items.push(
      {
        productId: "builder_subscription_starter_m_v1",
        version: 1,
        isActive: true,
        productType: "subscription",
        billingType: "recurring",
        appliesToRole: "builder",
        entitlementScope: "tenant",
        price: { amount: 9999, currency: "INR" },
        billingCycle: "monthly",
        limits: { projects: 1, units: 20 }
      },
      {
        productId: "builder_subscription_growth_m_v1",
        version: 1,
        isActive: true,
        productType: "subscription",
        billingType: "recurring",
        appliesToRole: "builder",
        entitlementScope: "tenant",
        price: { amount: 24999, currency: "INR" },
        billingCycle: "monthly",
        limits: { projects: 3, units: 100 }
      },
      {
        productId: "builder_subscription_enterprise_m_v1",
        version: 1,
        isActive: true,
        productType: "subscription",
        billingType: "recurring",
        appliesToRole: "builder",
        entitlementScope: "tenant",
        price: { amount: 49999, currency: "INR" },
        billingCycle: "monthly",
        limits: { projects: null, units: null }
      },
      {
        productId: "builder_project_spotlight_m_v1",
        version: 1,
        isActive: true,
        productType: "boost",
        billingType: "recurring",
        appliesToRole: "builder",
        entitlementScope: "project",
        price: { amount: 4999, currency: "INR" },
        billingCycle: "monthly",
        features: { homepageFeature: true }
      },
      {
        productId: "builder_unit_boost_weekly_v1",
        version: 1,
        isActive: true,
        productType: "boost",
        billingType: "one_time",
        appliesToRole: "builder",
        entitlementScope: "unit",
        price: { amount: 499, currency: "INR" },
        billingCycle: "weekly",
        durationDays: 7
      }
    );
  }

  return items;
}