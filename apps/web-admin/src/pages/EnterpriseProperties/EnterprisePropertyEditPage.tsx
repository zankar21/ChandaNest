import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EnterprisePropertyWizard from "./EnterprisePropertyWizard";
import { useAuth } from "../../hooks/useAuth";
import { useDocumentLockerEntitlement } from "../../hooks/useDocumentLockerEntitlement";
import { getListing } from "../../services/apiClient";

export default function EnterprisePropertyEditPage() {
  const { propertyId } = useParams();
  const { tenantId, refreshToken } = useAuth();
  const { entitlement } = useDocumentLockerEntitlement();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantId || !propertyId) return;
      setLoading(true);
      setError(null);
      try {
        await refreshToken();
        const res = await getListing(tenantId, propertyId);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load listing");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [tenantId, propertyId, refreshToken]);

  if (!propertyId) return null;
  if (loading) return <div className="text-sm text-muted">Loading listing...</div>;
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {entitlement.enabled ? (
          <Link
            to={`/documents?entityType=property&entityId=${encodeURIComponent(propertyId)}`}
            className="rounded-lg border border-theme px-3 py-2 text-sm font-semibold text-secondary hover:bg-surface hover:text-primary"
          >
            View property documents
          </Link>
        ) : null}
      </div>
      <EnterprisePropertyWizard initialListingId={propertyId} initialData={data} />
    </div>
  );
}
