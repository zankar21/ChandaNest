import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listAdminProjects,
  publishAdminProject,
  unpublishAdminProject
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/format";
import { isPlatformAdminRole, isTenantAdminRole } from "../../utils/roles";

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  plot: "Plot",
  commercial: "Commercial",
  mixed: "Mixed"
};

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  under_construction: "Under construction",
  ready: "Ready"
};

export default function ProjectsListPage() {
  const { tenantId, role } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState({
    q: "",
    type: "",
    status: "",
    visibility: ""
  });
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const canAdmin = role === "client_admin" || isTenantAdminRole(role) || isPlatformAdminRole(role);

  const canPageBack = cursorStack.length > 0;
  const emptyState = useMemo(
    () => (!loading && items.length === 0 ? "No projects yet." : null),
    [loading, items]
  );

  const fetchProjects = async (next?: string, resetStack?: boolean) => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminProjects(tenantId, {
        q: query.q.trim() || undefined,
        type: query.type || undefined,
        status: query.status || undefined,
        visibility: query.visibility || undefined,
        limit: 20,
        cursor: next
      });
      setItems(data.data.items || []);
      setNextCursor(data.data.nextCursor);
      setCursor(next);
      if (resetStack) setCursorStack([]);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const applyFilters = () => {
    fetchProjects(undefined, true);
  };

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor || ""]);
    fetchProjects(nextCursor);
  };

  const handlePrev = () => {
    const prev = cursorStack[cursorStack.length - 1];
    const nextStack = cursorStack.slice(0, -1);
    setCursorStack(nextStack);
    fetchProjects(prev || undefined);
  };

  const togglePublish = async (projectId: string, published?: boolean) => {
    if (!tenantId) return;
    setMutatingId(projectId);
    setError(null);
    try {
      if (published) {
        await unpublishAdminProject(tenantId, projectId);
      } else {
        await publishAdminProject(tenantId, projectId);
      }
      await fetchProjects(cursor);
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setMutatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Projects</h1>
          <p className="text-sm text-secondary">Manage tenant projects and unit inventory.</p>
        </div>
        <button className="btn-primary px-4 py-2 text-sm font-semibold" onClick={() => navigate("/projects/new")}>
          + New Project
        </button>
      </div>

      <div className="card-glass border border-theme p-4 shadow-sm space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={query.q}
            onChange={(e) => setQuery((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="Search name, slug, city"
            className="rounded-md input-glass px-3 py-2 text-sm"
          />
          <select
            value={query.type}
            onChange={(e) => setQuery((prev) => ({ ...prev, type: e.target.value }))}
            className="rounded-md input-glass px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="apartment">Apartment</option>
            <option value="plot">Plot</option>
            <option value="commercial">Commercial</option>
            <option value="mixed">Mixed</option>
          </select>
          <select
            value={query.status}
            onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-md input-glass px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="planning">Planning</option>
            <option value="under_construction">Under construction</option>
            <option value="ready">Ready</option>
          </select>
          <select
            value={query.visibility}
            onChange={(e) => setQuery((prev) => ({ ...prev, visibility: e.target.value }))}
            className="rounded-md input-glass px-3 py-2 text-sm"
          >
            <option value="">All visibility</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-secondary px-3 py-2 text-xs font-semibold" onClick={applyFilters}>
            Apply filters
          </button>
          <button
            className="rounded-md border border-theme px-3 py-2 text-xs font-semibold text-secondary hover-border-strong"
            onClick={() => {
              setQuery({ q: "", type: "", status: "", visibility: "" });
              fetchProjects(undefined, true);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {!tenantId ? (
        <div className="text-sm text-secondary">Loading tenant...</div>
      ) : loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : emptyState ? (
        <EmptyState title="No projects yet." action={<button className="btn-primary px-4 py-2 text-sm" onClick={() => navigate("/projects/new")}>Create project</button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl card-glass border border-theme bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-white/10 text-sm table-surface">
            <thead className="bg-surface text-left text-xs font-semibold text-secondary">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((project) => {
                const visibility = project.visibility?.state || "draft";
                return (
                  <tr key={project.id} className="hover:bg-surface">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-primary">{project.name || "Untitled"}</div>
                      <div className="text-xs text-secondary">
                        {(project.location?.area && project.location?.city)
                          ? `${project.location.area}, ${project.location.city}`
                          : project.location?.city || "Location pending"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {TYPE_LABELS[project.type] || project.type || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(project.status)}>
                        {STATUS_LABELS[project.status] || project.status || "-"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={toneForStatus(visibility)}>{visibility}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {project.counts?.availableUnits ?? 0} / {project.counts?.totalUnits ?? 0}
                    </td>
                    <td className="px-4 py-3 text-secondary">{formatDateTime(project.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="rounded-md border border-theme px-2.5 py-1 text-xs font-semibold text-secondary hover-border-strong"
                          onClick={() => navigate(`/projects/${project.id}/edit`)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md border border-theme px-2.5 py-1 text-xs font-semibold text-secondary hover-border-strong"
                          onClick={() => navigate(`/projects/${project.id}/units`)}
                        >
                          Units
                        </button>
                        <button
                          className="rounded-md btn-primary px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => togglePublish(project.id, visibility === "published")}
                          disabled={mutatingId === project.id || !canAdmin}
                          title={!canAdmin ? "Admin only" : undefined}
                        >
                          {visibility === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          className="rounded-md border border-theme px-3 py-1.5 text-xs font-semibold text-secondary hover-border-strong disabled:opacity-50"
          onClick={handlePrev}
          disabled={!canPageBack}
        >
          Prev
        </button>
        <button
          className="rounded-md border border-theme px-3 py-1.5 text-xs font-semibold text-secondary hover-border-strong disabled:opacity-50"
          onClick={handleNext}
          disabled={!nextCursor}
        >
          Next
        </button>
      </div>
    </div>
  );
}
