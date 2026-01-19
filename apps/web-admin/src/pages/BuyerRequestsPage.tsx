import { useEffect, useMemo, useState } from "react";
import { listBuyerRequests, getBuyerRequest, patchBuyerRequest } from "../services/buyerRequests";
import { useAuth } from "../hooks/useAuth";
import { isClientAdmin } from "../utils/roles";
import { TARGET_CITY_SLUGS, TARGET_CITIES, type TargetCitySlug } from "../constants/market";

type BuyerRequest = any;

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Created", value: "created" },
  { label: "Contacted", value: "contacted" },
  { label: "Closed", value: "closed" }
];

export default function BuyerRequestsPage() {
  const { refreshToken, user, tenantId } = useAuth();
  const [items, setItems] = useState<BuyerRequest[]>([]);
  const [filters, setFilters] = useState<{ status: string; citySlug: string }>({ status: "created", citySlug: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<BuyerRequest | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("created");
  const canEdit = useMemo(() => isClientAdmin(user), [user]);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      await refreshToken();
      const data = await listBuyerRequests(tenantId as string, filters);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.citySlug, tenantId]);

  const openDrawer = async (id: string) => {
    setDrawerId(id);
    setDrawerData(null);
    setDrawerLoading(true);
    try {
      await refreshToken();
      const data = await getBuyerRequest(tenantId as string, id);
      setDrawerData(data);
      setNotesDraft(data.notes || "");
      setStatusDraft(data.status || "created");
    } catch (err: any) {
      setError(err.message || "Failed to load request");
    } finally {
      setDrawerLoading(false);
    }
  };

  const saveDrawer = async () => {
    if (!drawerId) return;
    setSaving(true);
    setError(null);
    try {
      await refreshToken();
      await patchBuyerRequest(tenantId as string, drawerId, { status: statusDraft as any, notes: notesDraft });
      await openDrawer(drawerId);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Buyer Requests</h1>
          <p className="text-sm text-secondary">Manage inbound buyer requests.</p>
        </div>
        <button
          onClick={load}
          className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-primary hover:border-indigo-200"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-secondary">Status</label>
          <select
            className="mt-1 rounded-md input-glass px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary">City</label>
          <select
            className="mt-1 rounded-md input-glass px-3 py-2 text-sm"
            value={filters.citySlug}
            onChange={(e) => setFilters((f) => ({ ...f, citySlug: e.target.value }))}
          >
            <option value="">All</option>
            {TARGET_CITY_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {TARGET_CITIES[slug].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-secondary">No requests found.</div>
      ) : (
        <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-surface text-left text-xs font-semibold text-secondary">
              <tr>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Intent</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Budget</th>
                <th className="px-4 py-2">Buyer phone</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-sm">
              {items.map((item) => (
                <tr key={item.requestId}>
                  <td className="px-4 py-2">
                    {renderRelative(item.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    {TARGET_CITIES[(item.citySlug as TargetCitySlug)]?.name || item.citySlug}
                  </td>
                  <td className="px-4 py-2 capitalize">{item.intent}</td>
                  <td className="px-4 py-2 capitalize">{item.property?.category}</td>
                  <td className="px-4 py-2">{budgetText(item.budget)}</td>
                  <td className="px-4 py-2">{item.buyer?.phone || "-"}</td>
                  <td className="px-4 py-2">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => openDrawer(item.requestId)}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={Boolean(drawerId)}
        onClose={() => setDrawerId(null)}
        loading={drawerLoading}
        data={drawerData}
        statusDraft={statusDraft}
        notesDraft={notesDraft}
        setStatusDraft={setStatusDraft}
        setNotesDraft={setNotesDraft}
        onSave={saveDrawer}
        canEdit={canEdit}
        saving={saving}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    created: "bg-blue-100 text-blue-800",
    contacted: "bg-amber-100 text-amber-200",
    closed: "bg-emerald-100 text-emerald-800"
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || "bg-surface text-primary"}`}>
      {status}
    </span>
  );
}

function budgetText(budget: any) {
  const min = budget?.min;
  const max = budget?.max;
  if (min && max) return `₹${min} - ₹${max}`;
  if (min) return `From ₹${min}`;
  if (max) return `Up to ₹${max}`;
  return "-";
}

function Drawer({
  open,
  onClose,
  loading,
  data,
  statusDraft,
  setStatusDraft,
  notesDraft,
  setNotesDraft,
  onSave,
  canEdit,
  saving
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  data: any;
  statusDraft: string;
  setStatusDraft: (s: string) => void;
  notesDraft: string;
  setNotesDraft: (s: string) => void;
  onSave: () => void;
  canEdit: boolean;
  saving: boolean;
}) {
  return (
    <div
      className={`fixed inset-y-0 right-0 z-30 w-full max-w-xl transform transition duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full bg-surface shadow-xl border-l border-theme p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Request details</h2>
          <button onClick={onClose} className="text-sm text-secondary hover:text-primary">
            Close
          </button>
        </div>
        {loading || !data ? (
          <div className="text-sm text-secondary">Loading...</div>
        ) : (
          <div className="space-y-3 text-sm">
            <DetailRow label="Request ID" value={data.requestId} />
            <DetailRow
              label="Created"
              value={data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "-"}
            />
            <DetailRow
              label="Updated"
              value={data.updatedAt?.toDate ? data.updatedAt.toDate().toLocaleString() : "-"}
            />
            <DetailRow label="Partner" value={`${data.partner?.name || ""} (${data.partner?.id || ""})`} />
            <DetailRow label="Consent" value={`Granted at ${data.consent?.at?.toDate ? data.consent.at.toDate().toLocaleString() : "—"}`} />
            <DetailRow
              label="City"
              value={TARGET_CITIES[(data.citySlug as TargetCitySlug)]?.name || data.citySlug}
            />
            <DetailRow label="Locality" value={data.localityText || "-"} />
            <DetailRow label="Intent" value={data.intent} />
            <DetailRow
              label="Property"
              value={
                data.property?.category === "land"
                  ? "Land (plot)"
                  : `${data.property?.category || "-"} / ${data.property?.type || "-"}`
              }
            />
            <DetailRow label="Budget" value={budgetText(data.budget)} />
            <DetailRow label="Must haves" value={chipText(data.mustHaves)} />
            <DetailRow label="Deal breakers" value={chipText(data.dealBreakers)} />
            <DetailRow
              label="Buyer"
              value={`${data.buyer?.name || ""} / ${data.buyer?.phone || ""} / ${data.buyer?.preferredCallTime || "Anytime"}`}
            />
            <div className="space-y-1">
              <div className="text-xs text-secondary">Status</div>
              <select
                disabled={!canEdit}
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="w-full rounded-md input-glass px-3 py-2 text-sm disabled:bg-surface"
              >
                {STATUS_OPTIONS.filter((s) => s.value !== "").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-secondary">Notes</div>
              <textarea
                disabled={!canEdit}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="w-full rounded-md input-glass px-3 py-2 text-sm disabled:bg-surface"
                rows={3}
              />
            </div>
            {canEdit && (
              <div className="pt-2">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-xs text-muted w-32">{label}</div>
      <div className="flex-1 font-semibold text-primary">{value}</div>
    </div>
  );
}

function chipText(list: string[]) {
  if (!list || list.length === 0) return "-";
  return list.join(", ");
}

function renderRelative(ts: any) {
  const date = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}



