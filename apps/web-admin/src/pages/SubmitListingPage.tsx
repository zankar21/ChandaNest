import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MediaManager from "../components/MediaManager";
import { useAuth } from "../hooks/useAuth";
import {
  approveListing,
  getListing,
  validateListing,
  rejectListing,
  setListingVisibility,
  submitListing,
  unpublishListing
} from "../services/apiClient";
import { isClientAdmin } from "../utils/roles";
import { fieldSection, friendlyFieldLabel } from "../utils/fieldLabels";

export default function SubmitListingPage() {
  const { propertyId } = useParams();
  const { refreshToken, tenantId, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [validation, setValidation] = useState<{ canSubmit: boolean; canPublish: boolean; missing: string[] } | null>(
    null
  );
  const [validationFields, setValidationFields] = useState<string[]>([]);
  const canModerate = isClientAdmin(user);

  useEffect(() => {
    async function load() {
      if (!propertyId || !tenantId) return;
      setLoading(true);
      setError(null);
      try {
        await refreshToken();
        const data = await getListing(tenantId, propertyId);
        setListing(data);
        const v = await validateListing(tenantId, propertyId);
        setValidation(v);
        setValidationFields(v.missing || []);
      } catch (err: any) {
        setError(err.message || "Failed to load listing");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId, tenantId, refreshToken]);

  const act = async (action: "submit" | "approve" | "reject" | "publish" | "unpublish") => {
    if (!propertyId || !tenantId) return;
    setBusy(true);
    setError(null);
    try {
      await refreshToken();
      if (action === "submit") await submitListing(tenantId, propertyId);
      if (action === "approve") await approveListing(tenantId, propertyId);
      if (action === "reject") await rejectListing(tenantId, propertyId, rejectReason || "Rejected");
      if (action === "publish") await setListingVisibility(tenantId, propertyId, "published");
      if (action === "unpublish") await unpublishListing(tenantId, propertyId);
      const fresh = await getListing(tenantId, propertyId);
      setListing(fresh);
      const v = await validateListing(tenantId, propertyId);
      setValidation(v);
      setValidationFields(v.missing || []);
    } catch (err: any) {
      setError(err.message || "Action failed");
      if (err.code === "VALIDATION_FAILED" && Array.isArray(err.fields)) {
        setValidationFields(err.fields);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!propertyId) return <div>Missing listing id</div>;
  if (loading || !listing) return <div className="text-sm text-secondary">Loading listing...</div>;

  const media = listing.media || {};
  const workflowStatus = listing.moderation?.verificationStatus || "draft";
  const visibility = listing.visibility || "draft";
  const publishReady = validation?.canPublish ?? false;
  const missingFields = validationFields.length > 0 ? validationFields : validation?.missing || [];
  const groupedMissing = missingFields.reduce<Record<string, string[]>>((acc, field) => {
    const section = fieldSection(field);
    if (!acc[section]) acc[section] = [];
    acc[section].push(friendlyFieldLabel(field));
    return acc;
  }, {});
  const sectionAnchors: Record<string, string> = {
    "Land Records": "section-land-records",
    Area: "section-area",
    Location: "section-location",
    Pricing: "section-pricing",
    Rental: "section-pricing",
    Contact: "section-location",
    Photos: "section-media"
  };
  const scrollToSection = (section: string) => {
    const targetId = sectionAnchors[section];
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{listing.title || "Listing"}</h1>
          <p className="text-sm text-secondary">Mode: {listing.mode} · Status: {workflowStatus} · Visibility: {visibility}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => act("submit")}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Submit
          </button>
          {canModerate && (
            <>
              <button
                onClick={() => act("approve")}
                disabled={busy}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => act("reject")}
                disabled={busy}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Reject
              </button>
              <button
                onClick={() => act("publish")}
                disabled={busy || !publishReady}
                className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Publish
              </button>
              <button
                onClick={() => act("unpublish")}
                disabled={busy}
                className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-primary disabled:opacity-60"
              >
                Unpublish
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md input-glass bg-surface p-3 text-sm space-y-2">
        <div className="font-semibold text-primary">Backend checklist</div>
        {missingFields.length === 0 ? (
          <div className="text-xs text-emerald-700">All required fields are present.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(groupedMissing).map(([section, fields]) => (
              <div key={section} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <button
                  type="button"
                  onClick={() => scrollToSection(section)}
                  className="mb-2 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-amber-200 hover:underline"
                >
                  {section}
                </button>
                <ul className="space-y-1">
                  {fields.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {!publishReady && <div className="text-xs text-amber-200">Complete the missing items before publishing.</div>}
      </div>

      <div id="section-location" className="rounded-md input-glass bg-surface p-3 text-sm text-secondary space-y-2">
        <div className="font-semibold text-primary">Location</div>
        <div>{[listing.location?.citySlug, listing.location?.locality].filter(Boolean).join(", ") || "Not provided"}</div>
        <div id="section-pricing" className="font-semibold text-primary pt-2">Pricing</div>
        <div>{listing.pricing?.totalPrice ?? listing.pricing?.rentPerMonth ?? listing.pricing?.leaseAmount ?? "Not provided"}</div>
      </div>

      {(listing.propertyType === "land" || listing.propertyType === "plot") && (
        <div className="rounded-md input-glass bg-surface p-3 text-sm text-secondary space-y-2">
          {listing.propertyType === "land" && (
            <>
              <div id="section-land-records" className="font-semibold text-primary">
                Land Records (Maharashtra)
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-xs text-secondary">
                <div>Mouza: {listing.landRecord?.mouza || "—"}</div>
                <div>Survey / Gat No: {listing.landRecord?.surveyOrGatNo || "—"}</div>
                <div>Tehsil (Taluka): {listing.landRecord?.taluka || "—"}</div>
                <div>District: {listing.landRecord?.district || "—"}</div>
              </div>
            </>
          )}
          <div id="section-area" className="font-semibold text-primary pt-2">
            Area
          </div>
          <div className="text-xs text-secondary">
            {listing.area?.value ? `${listing.area.value} ${listing.area.unit || ""}` : "—"}
          </div>
        </div>
      )}

      <div id="section-media">
        <MediaManager
          propertyId={propertyId}
          tenantId={tenantId || "public"}
          media={media}
          onChange={(next) => setListing((prev: any) => ({ ...prev, media: next }))}
        />
      </div>

      <div className="rounded-md input-glass bg-surface p-3 text-sm">
        <div className="font-semibold text-primary mb-2">Reject reason</div>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full rounded-md input-glass px-3 py-2 text-sm"
          rows={3}
        />
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}
    </div>
  );
}



