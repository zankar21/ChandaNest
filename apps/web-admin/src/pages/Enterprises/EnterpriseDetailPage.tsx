import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEnterprise } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";

export default function EnterpriseDetailPage() {
  const { tenantId } = useAuth();
  const { enterpriseId } = useParams();
  const [enterprise, setEnterprise] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!tenantId || !enterpriseId) return () => {
      active = false;
    };
    setLoading(true);
    setError(null);
    getEnterprise(tenantId, enterpriseId)
      .then((data) => {
        if (active) setEnterprise(data);
      })
      .catch((err: any) => {
        if (active) setError(err.message || "Failed to load enterprise");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId, enterpriseId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Link to="/enterprises" className="text-sm text-secondary hover:text-primary">
          ← Back to Enterprises
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-primary">{enterprise?.name || "Enterprise Detail"}</h1>
      <p className="text-sm text-secondary">Enterprise profile and project access.</p>
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
              <div>{enterprise?.city || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Email</div>
              <div>{enterprise?.email || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">Phone</div>
              <div>{enterprise?.phone || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted">RERA ID</div>
              <div>{enterprise?.reraId || "-"}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/enterprises/${enterpriseId}/members`}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Manage Members
            </Link>
            <Link
              to={`/enterprises/${enterpriseId}/projects`}
              className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-secondary"
            >
              Projects & Inventory
            </Link>
            <Link
              to={`/org-verification/enterprise/${enterpriseId}`}
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




