import { formatCount } from "../../lib/dashboard/builderDashboardFormatters";
import { useNavigate } from "react-router-dom";
import type { DirectListingHealth } from "../../lib/dashboard/builderDashboardSelectors";

type Props = {
  listingHealth: DirectListingHealth;
};

export default function DirectListingsPanel({ listingHealth }: Props) {
  const navigate = useNavigate();

  const buildUrl = (params: Record<string, string>) => {
    return `/listings?${new URLSearchParams(params).toString()}`;
  };

  const primaryStats = [
    {
      label: "Published",
      value: listingHealth.published,
      tone: "success",
      to: buildUrl({ status: "published" })
    },
    {
      label: "Pending Review",
      value: listingHealth.pendingReview,
      tone: "warning",
      to: buildUrl({ status: "pending" })
    },
    {
      label: "Draft",
      value: listingHealth.draft,
      to: buildUrl({ status: "draft" })
    },
    {
      label: "Rejected",
      value: listingHealth.rejected,
      tone: "warning",
      to: buildUrl({ status: "rejected" })
    }
  ];

  const alertStats = [
    {
      label: "Needs Attention",
      value: listingHealth.needsAttention,
      to: buildUrl({ filter: "needs_attention" })
    },
    {
      label: "Ready to Submit",
      value: listingHealth.readyToSubmit,
      to: buildUrl({ filter: "ready" })
    }
  ];

  const assetStats = [
    { label: "Missing Hero", value: listingHealth.missingBreakdown.hero, key: "missingHero" },
    { label: "Missing Gallery", value: listingHealth.missingBreakdown.gallery, key: "missingGallery" },
    { label: "Missing Contact", value: listingHealth.missingBreakdown.contact, key: "missingContact" },
    { label: "Missing Location", value: listingHealth.missingBreakdown.location, key: "missingLocation" }
  ];

  return (
    <section className="rounded-[24px] card-glass border border-theme p-5 shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Listings Control
          </div>
          <h3 className="text-xl font-semibold text-slate-900">
            Direct Listings Overview
          </h3>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {primaryStats.map((item) => (
          <div
            key={item.label}
            onClick={() => navigate(item.to)}
            className={`cursor-pointer rounded-xl border p-4 transition hover:-translate-y-[2px]
              ${
                item.tone === "success"
                  ? "border-emerald-300 bg-emerald-50"
                  : item.tone === "warning"
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-slate-50"
              }`}
          >
            <div className="text-xs uppercase text-slate-500">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {formatCount(item.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {alertStats.map((item) => (
          <div
            key={item.label}
            onClick={() => navigate(item.to)}
            className="cursor-pointer rounded-xl border border-amber-300 bg-amber-50 p-4 transition hover:-translate-y-[2px]"
          >
            <div className="text-xs uppercase text-amber-700">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold text-amber-900">
              {formatCount(item.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-slate-200" />

      {/* Asset Issues */}
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-slate-500">
          Data Quality Issues
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {assetStats.map((item) => (
            <div
              key={item.label}
              onClick={() => navigate(buildUrl({ issue: item.key }))}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
            >
              <div className="text-xs text-slate-600">{item.label}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {formatCount(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
