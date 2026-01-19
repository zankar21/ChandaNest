import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { approveListing, listListings, rejectListing, submitListing, unpublishListing } from "../services/apiClient";
import { useAuth } from "../hooks/useAuth";
import { isClientAdmin } from "../utils/roles";

type Row = any;

export default function ListingsListPage() {
  const { refreshToken, user, tenantId } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const canModerate = isClientAdmin(user);

  const load = async () => {
    setLoading(true);
    setError(null);
    if (!tenantId) return;
    try {
      await refreshToken();
      const data = await listListings(tenantId);
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const act = async (action: "submit" | "approve" | "reject" | "unpublish", id: string) => {
    if (!tenantId) return;
    try {
      await refreshToken();
      if (action === "submit") await submitListing(tenantId, id);
      if (action === "approve") await approveListing(tenantId, id);
      if (action === "reject") await rejectListing(tenantId, id, "Rejected by admin");
      if (action === "unpublish") await unpublishListing(tenantId, id);
      await load();
    } catch (err: any) {
      setError(err.message || "Action failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Listings</h1>
          <p className="text-sm text-secondary">Manage draft and published listings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-primary hover:border-indigo-200"
          >
            Refresh
          </button>
          <Link
            to="/listings/new"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          >
            New Listing
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-secondary">No listings found.</div>
      ) : (
        <div className="overflow-hidden rounded-xl card-glass border border-theme bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-surface text-left text-xs font-semibold text-secondary">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Visibility</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((p) => (
                <tr key={p.id || p.listingId}>
                  <td className="px-4 py-2 font-semibold text-primary">{p.title || "Untitled"}</td>
                  <td className="px-4 py-2 text-secondary">{p.location?.citySlug}</td>
                  <td className="px-4 py-2 text-secondary">{p.visibility || "draft"}</td>
                  <td className="px-4 py-2 text-secondary">{p.moderation?.verificationStatus || "draft"}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => navigate(`/submit/${p.id || p.listingId}`)}
                        className="text-indigo-600 font-semibold hover:underline"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => navigate(`/listings/${p.id || p.listingId}/edit`)}
                        className="text-secondary hover:underline"
                      >
                        Edit
                      </button>
                      {canModerate && (
                        <>
                          <button onClick={() => act("submit", p.id || p.propertyId)} className="text-secondary hover:underline">
                            Submit
                          </button>
                          <button onClick={() => act("approve", p.id || p.propertyId)} className="text-emerald-600 hover:underline">
                            Approve
                          </button>
                          <button onClick={() => act("reject", p.id || p.propertyId)} className="text-rose-600 hover:underline">
                            Reject
                          </button>
                          <button onClick={() => act("unpublish", p.id || p.propertyId)} className="text-amber-600 hover:underline">
                            Unpublish
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



