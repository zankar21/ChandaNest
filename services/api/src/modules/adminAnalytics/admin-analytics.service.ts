import admin from "firebase-admin";
import { firestore } from "../../config/firebase";
import { AuthUser } from "../../types";
import { getSubscription } from "../billing/billing.service";
import { getPlan } from "../billing/plans";
import { AnalyticsSummaryQuerySchema } from "./admin-analytics.schemas";

type Summary = {
  listings: {
    drafts: number;
    submitted: number;
    published: number;
    draftToPublishedPct: number;
    avgTimeToPublishHours: number | null;
  };
  leads: {
    total: number;
    byStage: Record<string, number>;
    conversionPct: number;
    unassigned: number;
  };
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  revenue: {
    subscriptionsActive: number;
    mrrEstimate: number | null;
    invoicesCount: number;
    billingCycle: string | null;
    currentPlanAmount: number | null;
    lastPaymentAt: string | null;
  };
};

function ensureTenantAccess(user: AuthUser, tenantId: string) {
  if (!tenantId) throw new Error("Tenant required");
  if (user.tenantId !== tenantId && user.role !== "platform_admin") {
    throw new Error("Forbidden");
  }
}

function parseRange(input?: string) {
  if (!input) return 30;
  const match = input.match(/^(\d+)(d)$/);
  if (!match) return 30;
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days <= 0) return 30;
  return Math.min(days, 365);
}

function toMillis(value: any) {
  if (!value) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return null;
}

export async function getAnalyticsSummary(input: { tenantId: string; user: AuthUser; query: unknown }) {
  ensureTenantAccess(input.user, input.tenantId);
  const query = AnalyticsSummaryQuerySchema.parse(input.query);
  const rangeDays = parseRange(query.range);
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const listingsRef = firestore
    .collection("tenants")
    .doc(input.tenantId)
    .collection("listings")
    .where("updatedAt", ">=", since);
  const listingsSnap = await listingsRef.get();

  let drafts = 0;
  let submitted = 0;
  let published = 0;
  let total = 0;
  let publishDurations: number[] = [];

  listingsSnap.forEach((doc) => {
    const data = doc.data() as any;
    total += 1;
    const status =
      data?.moderation?.verificationStatus || data?.listingStatus || "draft";
    if (status === "approved") published += 1;
    else if (status === "pending" || status === "submitted") submitted += 1;
    else drafts += 1;

    const createdAt = toMillis(data?.createdAt);
    const approvedAt = toMillis(data?.moderation?.approvedAt);
    if (createdAt && approvedAt && approvedAt >= createdAt) {
      publishDurations.push((approvedAt - createdAt) / (1000 * 60 * 60));
    }
  });

  const avgTimeToPublishHours =
    publishDurations.length > 0
      ? Math.round(
          (publishDurations.reduce((a, b) => a + b, 0) / publishDurations.length) * 10
        ) / 10
      : null;

  const draftToPublishedPct = total > 0 ? Math.round((published / total) * 100) : 0;

  const leadsRef = firestore
    .collection("tenants")
    .doc(input.tenantId)
    .collection("leads")
    .where("updatedAt", ">=", since);
  const leadsSnap = await leadsRef.get();
  const byStage: Record<string, number> = {};
  let leadsTotal = 0;
  let closedWon = 0;
  let unassigned = 0;
  leadsSnap.forEach((doc) => {
    const data = doc.data() as any;
    const stage = data?.stage || "new";
    leadsTotal += 1;
    byStage[stage] = (byStage[stage] || 0) + 1;
    if (stage === "closed_won") closedWon += 1;
    if (!data?.assignee?.uid) unassigned += 1;
  });

  const approvalsRef = firestore
    .collection("approvals")
    .where("tenantId", "==", input.tenantId)
    .where("requestedAt", ">=", since);
  const approvalsSnap = await approvalsRef.get();
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  approvalsSnap.forEach((doc) => {
    const status = doc.get("status") as string;
    if (status === "approved") approved += 1;
    else if (status === "rejected") rejected += 1;
    else pending += 1;
  });

  const subscription = await getSubscription(input.tenantId);
  const subscriptionsActive = subscription?.status === "active" ? 1 : 0;
  const tenantSnap = await firestore.collection("tenants").doc(input.tenantId).get();
  const tenant = tenantSnap.exists ? (tenantSnap.data() as any) : null;
  const billingCycle = String(tenant?.billing?.billingCycle || tenant?.billingCycle || "monthly");
  const verifiedPaymentsSnap = await firestore
    .collection("tenants")
    .doc(input.tenantId)
    .collection("payments")
    .where("status", "==", "verified")
    .get();
  const currentPlanAmount =
    subscription?.planId && subscription.planId in { trial: true, starter: true, pro: true, enterprise: true }
      ? (() => {
          const plan = getPlan(subscription.planId as any);
          if (subscription.planId === "trial") return 0;
          if (subscription.planId === "starter") return 9999;
          if (subscription.planId === "pro") return 24999;
          if (subscription.planId === "enterprise") return 49999;
          return plan?.custom ? null : null;
        })()
      : null;
  const lastPaymentAtRaw = subscription?.billing?.lastPaymentAt ?? null;
  const lastPaymentAt =
    lastPaymentAtRaw && typeof lastPaymentAtRaw === "object" && typeof lastPaymentAtRaw.seconds === "number"
      ? new Date(lastPaymentAtRaw.seconds * 1000).toISOString()
      : typeof lastPaymentAtRaw === "string"
        ? lastPaymentAtRaw
        : null;

  const summary: Summary = {
    listings: {
      drafts,
      submitted,
      published,
      draftToPublishedPct,
      avgTimeToPublishHours
    },
    leads: {
      total: leadsTotal,
      byStage,
      conversionPct: leadsTotal > 0 ? Math.round((closedWon / leadsTotal) * 100) : 0,
      unassigned
    },
    approvals: {
      pending,
      approved,
      rejected
    },
    revenue: {
      subscriptionsActive,
      mrrEstimate: currentPlanAmount,
      invoicesCount: verifiedPaymentsSnap.size,
      billingCycle: billingCycle || null,
      currentPlanAmount,
      lastPaymentAt
    }
  };

  return summary;
}
