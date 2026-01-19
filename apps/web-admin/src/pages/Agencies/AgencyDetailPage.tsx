import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAgency } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";

export default function AgencyDetailPage() {
  const { tenantId } = useAuth();
  const { agencyId } = useParams();
  const [agency, setAgency] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!tenantId || !agencyId) return () => {
      active = false;
    };
    setLoading(true);
    setError(null);
    getAgency(tenantId, agencyId)
      .then((data) => {
        if (active) setAgency(data);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load agency");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, agencyId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Link to="/agencies" className="text-sm text-secondary hover:text-primary">
          ← Back to Agencies
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-primary">{agency?.name || "Agency Detail"}</h1>
      <p className="text-sm text-secondary">Agency profile and verification shortcuts.</p>
      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <div className="text-sm text-rose-600">{error}</div>
      ) : (
        <div className="rounded-xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 text-sm text-secondary">
            <div>
              <div className="text-xs uppercase text-muted">City</div>
              <div>{agency?.city || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Email</div>
              <div>{agency?.email || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Phone</div>
              <div>{agency?.phone || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">RERA ID</div>
              <div>{agency?.reraId || "-"}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/agencies/${agencyId}/members`}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Manage Members
            </Link>
            <Link
              to={`/org-verification/agency/${agencyId}`}
              className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-secondary"
            >
              Open Verification
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}




