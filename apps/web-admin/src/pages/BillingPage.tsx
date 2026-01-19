import React from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  cancelSubscription,
  getBillingSubscription,
  overrideOnboarding,
  overrideSubscription
} from "../services/apiClient";
import type { BillingSubscriptionResponse, Subscription } from "../services/apiTypes";
import ErrorBanner from "../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../components/StatusBadge";
import { formatDateTime } from "../utils/format";
import Modal from "../components/Modal";
import { isPlatformAdminRole, isTenantAdminRole } from "../utils/roles";

function formatMaybeTimestamp(value?: any) {
  if (!value) return "-";
  if (typeof value === "string") return formatDateTime(value);
  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number") {
    return formatDateTime(new Date(seconds * 1000).toISOString());
  }
  return "-";
}

export default function BillingPage() {
  const { role, tenantId: authTenantId } = useAuth();
  const [searchParams] = useSearchParams();
  const isPlatformAdmin = isPlatformAdminRole(role);
  const isTenantAdmin = isTenantAdminRole(role) || isPlatformAdmin;

  const queryTenantId = searchParams.get("tenantId") ?? "";
  const effectiveTenantId = isPlatformAdmin ? queryTenantId || authTenantId || "" : authTenantId || "";

  const [billingData, setBillingData] = React.useState<BillingSubscriptionResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false);
  const [onboardingConfirmOpen, setOnboardingConfirmOpen] = React.useState(false);
  const [onboardingAction, setOnboardingAction] = React.useState<"paid" | "waived" | null>(null);

  const [overrideTenantId, setOverrideTenantId] = React.useState(queryTenantId || "");
  const [overridePlan, setOverridePlan] = React.useState("trial");
  const [overrideStatus, setOverrideStatus] = React.useState("active");
  const [overrideValidTill, setOverrideValidTill] = React.useState("");
  const [overrideSubmitting, setOverrideSubmitting] = React.useState(false);

  const [onboardingTenantId, setOnboardingTenantId] = React.useState(queryTenantId || "");
  const [onboardingStatus, setOnboardingStatus] = React.useState("pending");
  const [onboardingSubmitting, setOnboardingSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!effectiveTenantId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await getBillingSubscription(isPlatformAdmin ? effectiveTenantId : undefined);
      setBillingData(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [effectiveTenantId, isPlatformAdmin]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!isTenantAdmin) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        You do not have permission to view billing.
      </div>
    );
  }

  const subscription: Subscription | null = billingData?.subscription ?? null;
  const tenantSummary = billingData?.tenant;
  const onboarding = billingData?.onboarding ?? null;
  const isPremier = tenantSummary?.type === "enterprise" && tenantSummary?.enterpriseTier === "premier";
  const onboardingPending = Boolean(isPremier && onboarding?.required && onboarding?.status === "pending");
  const onboardingState = onboarding?.status ?? null;
  const onboardingTenant = effectiveTenantId || tenantSummary?.tenantId || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-primary">Billing</h1>
          {onboardingState && onboardingState !== "pending" ? (
            <StatusBadge tone={onboardingState === "paid" ? "green" : "blue"}>
              Onboarding: {onboardingState}
            </StatusBadge>
          ) : null}
        </div>
        {isPlatformAdmin ? (
          <div className="text-sm text-secondary">Tenant context: {effectiveTenantId || "Select tenant"}</div>
        ) : null}
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      {subscription?.status && ["expired", "canceled", "past_due"].includes(subscription.status) ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Subscription is {subscription.status}. Access may be limited.
        </div>
      ) : null}

      {onboardingPending ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Enterprise Premier onboarding required</div>
              <p className="mt-1 text-sm">
                Onboarding fee ₹2,50,000 is pending. Access is locked until Paid or Waived.
              </p>
              <p className="mt-1 text-xs text-amber-200">Contact platform admin to complete onboarding.</p>
            </div>
            {isPlatformAdmin ? (
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={!onboardingTenant}
                  onClick={() => {
                    setOnboardingAction("paid");
                    setOnboardingConfirmOpen(true);
                  }}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Mark Paid
                </button>
                <button
                  disabled={!onboardingTenant}
                  onClick={() => {
                    setOnboardingAction("waived");
                    setOnboardingConfirmOpen(true);
                  }}
                  className="rounded-md border border-amber-300 bg-surface px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-60"
                >
                  Waive
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl card-glass border border-theme bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-secondary">Plan</h2>
            {subscription?.status ? (
              <StatusBadge tone={toneForStatus(subscription.status)}>{subscription.status}</StatusBadge>
            ) : null}
          </div>
          <div className="mt-3 space-y-2 text-sm text-secondary">
            <div>Plan: <span className="font-medium">{subscription?.planId ?? "-"}</span></div>
            <div>Valid till: <span className="font-medium">{formatMaybeTimestamp(subscription?.validTill)}</span></div>
            <div>
              Listing limit:{" "}
              <span className="font-medium">
                {subscription?.limits?.listingLimit === null
                  ? "Unlimited"
                  : subscription?.limits?.listingLimit ?? "-"}
              </span>
            </div>
            <div>
              Featured limit:{" "}
              <span className="font-medium">
                {subscription?.limits?.featuredLimit === null
                  ? "Unlimited"
                  : subscription?.limits?.featuredLimit ?? "-"}
              </span>
            </div>
            <div>Agent seats: <span className="font-medium">{subscription?.limits?.agentSeats ?? "-"}</span></div>
          </div>
        </div>

        <div className="rounded-xl card-glass border border-theme bg-surface p-4">
          <h2 className="text-sm font-semibold text-secondary">Usage</h2>
          <div className="mt-3 space-y-2 text-sm text-secondary">
            <div>
              Listings created:{" "}
              <span className="font-medium">{subscription?.usage?.listingsCreated ?? "Not available"}</span>
            </div>
            <div>
              Featured listings:{" "}
              <span className="font-medium">{subscription?.usage?.featuredListings ?? "Not available"}</span>
            </div>
            <div>
              Agent seats used:{" "}
              <span className="font-medium">{subscription?.usage?.agentSeatsUsed ?? "Not available"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setCancelOpen(true)}
          className="rounded-md input-glass px-3 py-2 text-sm font-semibold"
        >
          Cancel subscription
        </button>
      </div>

      {isPlatformAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl card-glass border border-theme bg-surface p-4">
            <h2 className="text-sm font-semibold text-secondary">Subscription override</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted">Tenant ID</label>
                <input
                  value={overrideTenantId}
                  onChange={(e) => setOverrideTenantId(e.target.value)}
                  className="mt-1 w-full rounded-md input-glass px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Plan</label>
                <select
                  value={overridePlan}
                  onChange={(e) => setOverridePlan(e.target.value)}
                  className="mt-1 w-full rounded-md input-glass px-3 py-2"
                >
                  <option value="trial">trial</option>
                  <option value="starter">starter</option>
                  <option value="pro">pro</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="mt-1 w-full rounded-md input-glass px-3 py-2"
                >
                  <option value="active">active</option>
                  <option value="trialing">trialing</option>
                  <option value="expired">expired</option>
                  <option value="canceled">canceled</option>
                  <option value="past_due">past_due</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted">Valid till</label>
                <input
                  type="date"
                  value={overrideValidTill}
                  onChange={(e) => setOverrideValidTill(e.target.value)}
                  className="mt-1 w-full rounded-md input-glass px-3 py-2"
                />
              </div>
              <button
                onClick={async () => {
                  if (!overrideTenantId) return;
                  setOverrideSubmitting(true);
                  setError(null);
                  try {
                    await overrideSubscription({
                      tenantId: overrideTenantId,
                      planId: overridePlan,
                      status: overrideStatus,
                      validTill: overrideValidTill ? new Date(overrideValidTill).toISOString() : undefined
                    });
                    await load();
                  } catch (err: any) {
                    setError(err?.message ?? "Override failed");
                  } finally {
                    setOverrideSubmitting(false);
                  }
                }}
                disabled={overrideSubmitting || !overrideTenantId}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {overrideSubmitting ? "Saving..." : "Save override"}
              </button>
            </div>
          </div>

          <div className="rounded-xl card-glass border border-theme bg-surface p-4">
            <h2 className="text-sm font-semibold text-secondary">Onboarding override</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted">Tenant ID</label>
                <input
                  value={onboardingTenantId}
                  onChange={(e) => setOnboardingTenantId(e.target.value)}
                  className="mt-1 w-full rounded-md input-glass px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Status</label>
                <select
                  value={onboardingStatus}
                  onChange={(e) => setOnboardingStatus(e.target.value)}
                  className="mt-1 w-full rounded-md input-glass px-3 py-2"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="waived">waived</option>
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!onboardingTenantId) return;
                  setOnboardingSubmitting(true);
                  setError(null);
                  try {
                    await overrideOnboarding({
                      tenantId: onboardingTenantId,
                      status: onboardingStatus
                    });
                    setSuccess("Onboarding status updated.");
                    await load();
                  } catch (err: any) {
                    setError(err?.message ?? "Onboarding override failed");
                  } finally {
                    setOnboardingSubmitting(false);
                  }
                }}
                disabled={onboardingSubmitting || !onboardingTenantId}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {onboardingSubmitting ? "Saving..." : "Save onboarding"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal open={cancelOpen} title="Cancel subscription" onClose={() => setCancelOpen(false)}>
        <div className="space-y-4 text-sm text-secondary">
          <p>Canceling will mark the subscription as canceled. This does not change valid till.</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setCancelSubmitting(true);
                setError(null);
                try {
                  await cancelSubscription();
                  await load();
                  setCancelOpen(false);
                } catch (err: any) {
                  setError(err?.message ?? "Cancel failed");
                } finally {
                  setCancelSubmitting(false);
                }
              }}
              disabled={cancelSubmitting}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {cancelSubmitting ? "Canceling..." : "Confirm cancel"}
            </button>
            <button
              onClick={() => setCancelOpen(false)}
              className="rounded-md input-glass px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={onboardingConfirmOpen}
        title="Confirm onboarding status change"
        onClose={() => {
          if (!onboardingSubmitting) {
            setOnboardingConfirmOpen(false);
            setOnboardingAction(null);
          }
        }}
      >
        <div className="space-y-4 text-sm text-secondary">
          <p>This action is immediate and will update the onboarding status.</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!onboardingTenant || !onboardingAction) return;
                setOnboardingSubmitting(true);
                setError(null);
                try {
                  await overrideOnboarding({ tenantId: onboardingTenant, status: onboardingAction });
                  setSuccess(`Onboarding marked as ${onboardingAction}.`);
                  await load();
                  setOnboardingConfirmOpen(false);
                  setOnboardingAction(null);
                } catch (err: any) {
                  setError(err?.message ?? "Onboarding override failed");
                } finally {
                  setOnboardingSubmitting(false);
                }
              }}
              disabled={onboardingSubmitting || !onboardingTenant}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {onboardingSubmitting ? "Updating..." : "Confirm"}
            </button>
            <button
              onClick={() => {
                if (!onboardingSubmitting) {
                  setOnboardingConfirmOpen(false);
                  setOnboardingAction(null);
                }
              }}
              className="rounded-md input-glass px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}



