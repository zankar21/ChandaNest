import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getBuilderCapSummary,
  getAnalyticsSummary,
  getBillingSubscription,
  getTeamMe,
  listListings
} from "../services/apiClient";
import { useDocumentLockerEntitlement } from "../hooks/useDocumentLockerEntitlement";
import type { BillingSubscriptionResponse, TeamMeResponse } from "../services/apiTypes";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../hooks/useAuth";
import { PLAN_SUMMARIES, planFromBillingPlan } from "../lib/planSummaries";
import {
  summarizeProjectInventory,
  summarizeTeamOperations,
  buildHeroMetrics,
  buildRecommendedActions,
  type DirectListingHealth,
  type LeadPipelineSummary
} from "../lib/dashboard/builderDashboardSelectors";
import AdminWorkspaceHero from "../components/admin/AdminWorkspaceHero";
import KPIGrid from "../components/dashboard/KPIGrid";
import DirectListingsPanel from "../components/dashboard/DirectListingsPanel";
import ProjectInventoryPanel from "../components/dashboard/ProjectInventoryPanel";
import LeadPipelinePanel from "../components/dashboard/LeadPipelinePanel";
import TeamCapacityPanel from "../components/dashboard/TeamCapacityPanel";
import PlanUsagePanel from "../components/dashboard/PlanUsagePanel";
import SmartInsightsPanel from "../components/dashboard/SmartInsightsPanel";

type ListingRecord = Record<string, unknown>;
type AnalyticsSummary = Record<string, unknown> | null;
type BuilderCapSummary = Record<string, unknown> | null;
type TeamMeta = TeamMeResponse | null;

type DashboardLoadState = {
  listings: ListingRecord[];
  analytics: AnalyticsSummary;
  billingData: BillingSubscriptionResponse | null;
  builderCapSummary: BuilderCapSummary;
  teamMeta: TeamMeta;
};

const INITIAL_STATE: DashboardLoadState = {
  listings: [],
  analytics: null,
  billingData: null,
  builderCapSummary: null,
  teamMeta: null
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load dashboard";
}

function normalizePayload<T>(response: unknown): T | null {
  if (!response || typeof response !== "object") return null;
  const maybeWrapped = response as { data?: T };
  return (maybeWrapped.data as T) ?? (response as T);
}

function normalizeListings(response: unknown): ListingRecord[] {
  if (!response || typeof response !== "object") return [];
  const maybeItems = (response as { items?: unknown }).items;
  return Array.isArray(maybeItems) ? (maybeItems as ListingRecord[]) : [];
}

function derivePlanMeta(
  billingData: BillingSubscriptionResponse | null,
  tenantId: string | null | undefined
) {
  const subscription = billingData?.subscription ?? null;
  const planKey = planFromBillingPlan(subscription?.planId);
  const planSummary = planKey ? PLAN_SUMMARIES[planKey] : null;

  return {
    subscription,
    planLabel: planSummary?.label ?? subscription?.planId ?? "Builder Enterprise Monthly",
    planStatus: subscription?.status ?? "active",
    listingLimit: subscription?.limits?.listingLimit ?? null,
    listingUsage: subscription?.usage?.listingsCreated ?? 0,
    featuredLimit: subscription?.limits?.featuredLimit ?? null,
    featuredUsage: subscription?.usage?.featuredListings ?? 0,
    tenantName: billingData?.tenant?.tenantId ?? tenantId ?? "Unknown tenant"
  };
}

function summarizeDashboardListings(listings: ListingRecord[]): DirectListingHealth {
  const health: DirectListingHealth = {
    total: listings.length,
    published: 0,
    draft: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    readyToSubmit: 0,
    needsAttention: 0,
    missingBreakdown: {
      hero: 0,
      gallery: 0,
      contact: 0,
      location: 0
    }
  };

  listings.forEach((item) => {
    const record = (item?.listing as Record<string, unknown> | undefined) ?? item;
    const publishState = (record?.publishState as string | undefined) ?? (record?.status as string | undefined) ?? "draft";
    const moderationStatus = (record?.moderation as { verificationStatus?: string } | undefined)?.verificationStatus ?? null;
    const recordStatus = (record?.recordStatus as string | undefined) ?? "active";
    const mediaItems = Array.isArray(record?.mediaItems) ? record.mediaItems : [];
    const coverMediaId = typeof record?.coverMediaId === "string" ? record.coverMediaId : null;
    const hasHero = Boolean(coverMediaId && mediaItems.some((entry: any) => entry?.id === coverMediaId));
    const hasGallery = mediaItems.length > 0;
    const contact = (record?.contact as Record<string, unknown> | undefined) ?? {};
    const hasContact = Boolean(contact.phone || contact.email);
    const location = (record?.location as Record<string, unknown> | undefined) ?? {};
    const hasLocation = Boolean(location.citySlug || location.city || location.locality || location.neighborhood);
    const missingAny = !hasHero || !hasGallery || !hasContact || !hasLocation;

    if (publishState === "draft" || publishState === "unpublished") {
      health.draft += 1;
    }
    if (moderationStatus === "pending" || moderationStatus === "submitted") {
      health.pendingReview += 1;
    }
    if (moderationStatus === "approved") {
      health.approved += 1;
    }
    if (moderationStatus === "rejected") {
      health.rejected += 1;
    }
    if (publishState === "published" && recordStatus === "active") {
      health.published += 1;
    }
    if ((publishState === "draft" || publishState === "unpublished") && hasHero && hasGallery && hasContact && hasLocation) {
      health.readyToSubmit += 1;
    }

    if (!hasHero) health.missingBreakdown.hero += 1;
    if (!hasGallery) health.missingBreakdown.gallery += 1;
    if (!hasContact) health.missingBreakdown.contact += 1;
    if (!hasLocation) health.missingBreakdown.location += 1;
    if (missingAny) health.needsAttention += 1;
  });

  return health;
}

function summarizeDashboardLeadPipeline(analytics: AnalyticsSummary): LeadPipelineSummary {
  const leads = analytics?.leads as
    | {
        total?: number;
        conversionPct?: number;
        byStage?: Record<string, number>;
        unassigned?: number;
      }
    | undefined;

  return {
    total: leads?.total ?? 0,
    conversionPct: leads?.conversionPct ?? 0,
    stages: leads?.byStage ?? {},
    unassigned: leads?.unassigned ?? 0
  };
}

export default function DashboardPage() {
  const { refreshToken, tenantId } = useAuth();
  const { entitlement } = useDocumentLockerEntitlement();

  const [dashboardState, setDashboardState] = useState<DashboardLoadState>(INITIAL_STATE);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!tenantId) {
        if (isMounted) {
          setError("Tenant not available");
          setDashboardState(INITIAL_STATE);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await refreshToken();

        const listingsPromise = listListings(tenantId);
        const analyticsPromise = getAnalyticsSummary(tenantId, "30d").catch(() => null);
        const billingPromise = getBillingSubscription().catch(() => null);
        const builderCapPromise = getBuilderCapSummary().catch(() => null);
        const teamPromise = getTeamMe().catch(() => null);

        const [listingsRes, analyticsRes, billingRes, builderCapRes, teamRes] = await Promise.all([
          listingsPromise,
          analyticsPromise,
          billingPromise,
          builderCapPromise,
          teamPromise
        ]);

        if (!isMounted) return;

        setDashboardState({
          listings: normalizeListings(listingsRes),
          analytics: normalizePayload<Record<string, unknown>>(analyticsRes),
          billingData: (billingRes as BillingSubscriptionResponse | null) ?? null,
          builderCapSummary: normalizePayload<Record<string, unknown>>(builderCapRes),
          teamMeta: normalizePayload<TeamMeResponse>(teamRes)
        });
      } catch (loadError: unknown) {
        if (!isMounted) return;
        setError(getErrorMessage(loadError));
        setDashboardState(INITIAL_STATE);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [refreshToken, tenantId]);

  const { listings, analytics, billingData, builderCapSummary, teamMeta } = dashboardState;

  const listingHealth = useMemo(() => summarizeDashboardListings(listings), [listings]);

  const projectHealth = useMemo(
    () => summarizeProjectInventory(builderCapSummary),
    [builderCapSummary]
  );

  const leadPipeline = useMemo(() => summarizeDashboardLeadPipeline(analytics), [analytics]);

  const teamOperations = useMemo(() => summarizeTeamOperations(teamMeta), [teamMeta]);

  const heroMetrics = useMemo(
    () =>
      buildHeroMetrics({
        listingHealth,
        projectInventory: projectHealth,
        leadPipeline,
        teamOperations
      }),
    [listingHealth, projectHealth, leadPipeline, teamOperations]
  );

  const recommendedActions = useMemo(
    () =>
      buildRecommendedActions({
        listingHealth,
        projectInventory: projectHealth,
        leadPipeline,
        teamOperations
      }),
    [listingHealth, projectHealth, leadPipeline, teamOperations]
  );

  const {
    planLabel,
    planStatus,
    listingLimit,
    listingUsage,
    featuredLimit,
    featuredUsage,
    tenantName
  } = useMemo(() => derivePlanMeta(billingData, tenantId), [billingData, tenantId]);

  const headerActions = useMemo(
    () => [
      { label: "New Listing", to: "/listings/new", variant: "primary" as const },
      { label: "New Project", to: "/projects/new" },
      { label: "View Leads", to: "/leads" },
      { label: "Manage Team", to: "/team" }
    ],
    []
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-[16px] border border-theme bg-surface/60 p-4 shadow-sm text-sm text-secondary">
          Loading dashboard…
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <ErrorBanner message="Tenant not available" />
      </div>
    );
  }

  return (
    <div className="space-y-4">      <AdminWorkspaceHero
        eyebrow="Enterprise Command Center"
        title="Dashboard"
        description="Monitor listings, projects, leads, team readiness, and plan usage from one premium workspace."
        stats={[
          { label: "Tenant", value: tenantName || "Tenant" },
          { label: "Active Plan", value: planLabel || "Builder Enterprise Monthly", tone: "warning" },
          { label: "Live Listings", value: listingHealth.published, tone: listingHealth.published > 0 ? "success" : "default" }
        ]}
        actions={
          <>
            {headerActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={action.variant === "primary" ? "rounded-xl btn-primary px-4 py-3 text-sm font-semibold" : "rounded-xl btn-secondary px-4 py-3 text-sm font-semibold"}
              >
                {action.label}
              </Link>
            ))}
          </>
        }
        aside={
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">Plan status</div>
            <div className="text-sm leading-6 text-slate-200">{planStatus ? `Current billing status: ${planStatus}.` : "Billing status is active."}</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">{listingLimit != null ? `${listingUsage} of ${listingLimit} listing slots are in use.` : `${listingUsage} listings are currently active in your workspace.`}</div>
          </div>
        }
      />

      {error ? <ErrorBanner message={error} /> : null}

      <KPIGrid metrics={heroMetrics} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DirectListingsPanel listingHealth={listingHealth} />
        <ProjectInventoryPanel projectHealth={projectHealth} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadPipelinePanel leadPipeline={leadPipeline} />
        </div>
        <TeamCapacityPanel teamOperations={teamOperations} leadPipeline={leadPipeline} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PlanUsagePanel
            listingUsage={listingUsage}
            listingLimit={listingLimit}
            featuredUsage={featuredUsage}
            featuredLimit={featuredLimit}
            projectHealth={projectHealth}
            documentLocker={entitlement}
          />
        </div>
        <SmartInsightsPanel actions={recommendedActions} />
      </div>
    </div>
  );
}




