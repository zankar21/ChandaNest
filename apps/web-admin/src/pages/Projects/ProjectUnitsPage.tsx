import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createAdminProjectUnit,
  deleteAdminProjectUnit,
  listAdminProjectUnits,
  updateAdminProjectUnit
} from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuth";
import EmptyState from "../../components/EmptyState";
import ErrorBanner from "../../components/ErrorBanner";
import StatusBadge, { toneForStatus } from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/format";
import { isPlatformAdminRole, isTenantAdminRole } from "../../utils/roles";

const availabilityOptions = ["available", "blocked", "sold"];

export default function ProjectUnitsPage() {
  const { tenantId, role } = useAuth();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    type: "",
    availability: "available",
    areaSqFt: "",
    carpetSqFt: "",
    builtUpSqFt: "",
    price: "",
    floor: "",
    facing: ""
  });

  const canAdmin = role === "client_admin" || isTenantAdminRole(role) || isPlatformAdminRole(role);
  const summary = useMemo(() => {
    const total = items.length;
    const available = items.filter((item) => item.availability === "available").length;
    const blocked = items.filter((item) => item.availability === "blocked").length;
    const sold = items.filter((item) => item.availability === "sold").length;
    return { total, available, blocked, sold };
  }, [items]);

  const emptyState = useMemo(() => (!loading && items.length === 0 ? "No units yet." : null), [loading, items]);

  const refresh = async () => {
    if (!tenantId || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminProjectUnits(tenantId, projectId);
      setItems(data.data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, projectId]);

  const validateUnit = (data: any) => {
    const errors: Record<string, string> = {};
    const numericFields = ["areaSqFt", "carpetSqFt", "builtUpSqFt", "price", "floor"];
    numericFields.forEach((field) => {
      const value = data[field];
      if (value === "" || value === undefined || value === null) return;
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0) {
        errors[field] = "Must be a number >= 0";
      }
    });
    if (!data.type?.trim()) {
      errors.type = "Type is required";
    }
    return errors;
  };

  const submitCreate = async () => {
    if (!tenantId || !projectId) return;
    const errors = validateUnit(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Fix highlighted fields.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAdminProjectUnit(tenantId, projectId, {
        type: form.type.trim(),
        availability: form.availability,
        areaSqFt: form.areaSqFt ? Number(form.areaSqFt) : undefined,
        carpetSqFt: form.carpetSqFt ? Number(form.carpetSqFt) : undefined,
        builtUpSqFt: form.builtUpSqFt ? Number(form.builtUpSqFt) : undefined,
        price: form.price ? Number(form.price) : undefined,
        floor: form.floor ? Number(form.floor) : undefined,
        facing: form.facing.trim() || undefined
      });
      setForm({
        type: "",
        availability: "available",
        areaSqFt: "",
        carpetSqFt: "",
        builtUpSqFt: "",
        price: "",
        floor: "",
        facing: ""
      });
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create unit");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (unit: any) => {
    if (!canAdmin) return;
    setEditId(unit.id);
    setEditForm({
      type: unit.type || "",
      availability: unit.availability || "available",
      areaSqFt: unit.areaSqFt?.toString() || "",
      carpetSqFt: unit.carpetSqFt?.toString() || "",
      builtUpSqFt: unit.builtUpSqFt?.toString() || "",
      price: unit.price?.toString() || "",
      floor: unit.floor?.toString() || "",
      facing: unit.facing || ""
    });
  };

  const saveEdit = async () => {
    if (!tenantId || !projectId || !editId) return;
    const errors = validateUnit(editForm);
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Fix highlighted fields.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateAdminProjectUnit(tenantId, projectId, editId, {
        type: editForm.type?.trim(),
        availability: editForm.availability,
        areaSqFt: editForm.areaSqFt ? Number(editForm.areaSqFt) : undefined,
        carpetSqFt: editForm.carpetSqFt ? Number(editForm.carpetSqFt) : undefined,
        builtUpSqFt: editForm.builtUpSqFt ? Number(editForm.builtUpSqFt) : undefined,
        price: editForm.price ? Number(editForm.price) : undefined,
        floor: editForm.floor ? Number(editForm.floor) : undefined,
        facing: editForm.facing?.trim() || undefined
      });
      setEditId(null);
      setEditForm({});
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to update unit");
    } finally {
      setSaving(false);
    }
  };

  const removeUnit = async (unitId: string) => {
    if (!tenantId || !projectId) return;
    if (!canAdmin) return;
    const ok = window.confirm("Delete this unit? This cannot be undone.");
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAdminProjectUnit(tenantId, projectId, unitId);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete unit");
    } finally {
      setSaving(false);
    }
  };

  if (!tenantId || !projectId) {
    return <div className="text-sm text-secondary">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Project Units</h1>
          <p className="text-sm text-secondary">Manage unit availability and pricing.</p>
        </div>
        <button className="btn-secondary px-4 py-2 text-sm font-semibold" onClick={() => navigate("/projects")}>
          Back to Projects
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="card-glass border border-theme p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
          <span className="rounded-full bg-surface px-2.5 py-1">Total: {summary.total}</span>
          <span className="rounded-full bg-surface px-2.5 py-1">Available: {summary.available}</span>
          <span className="rounded-full bg-surface px-2.5 py-1">Blocked: {summary.blocked}</span>
          <span className="rounded-full bg-surface px-2.5 py-1">Sold: {summary.sold}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            placeholder="Unit type (e.g., 2BHK)"
            className={`rounded-md input-glass px-3 py-2 text-sm ${formErrors.type ? "border-rose-500/60" : ""}`}
            disabled={!canAdmin}
          />
          <select
            value={form.availability}
            onChange={(e) => setForm((prev) => ({ ...prev, availability: e.target.value }))}
            className="rounded-md input-glass px-3 py-2 text-sm"
            disabled={!canAdmin}
          >
            {availabilityOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input
            value={form.areaSqFt}
            onChange={(e) => setForm((prev) => ({ ...prev, areaSqFt: e.target.value }))}
            placeholder="Area (sq ft)"
            className={`rounded-md input-glass px-3 py-2 text-sm ${formErrors.areaSqFt ? "border-rose-500/60" : ""}`}
            disabled={!canAdmin}
          />
          <input
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="Price"
            className={`rounded-md input-glass px-3 py-2 text-sm ${formErrors.price ? "border-rose-500/60" : ""}`}
            disabled={!canAdmin}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={form.carpetSqFt}
            onChange={(e) => setForm((prev) => ({ ...prev, carpetSqFt: e.target.value }))}
            placeholder="Carpet area"
            className={`rounded-md input-glass px-3 py-2 text-sm ${formErrors.carpetSqFt ? "border-rose-500/60" : ""}`}
            disabled={!canAdmin}
          />
          <input
            value={form.builtUpSqFt}
            onChange={(e) => setForm((prev) => ({ ...prev, builtUpSqFt: e.target.value }))}
            placeholder="Built-up area"
            className={`rounded-md input-glass px-3 py-2 text-sm ${formErrors.builtUpSqFt ? "border-rose-500/60" : ""}`}
            disabled={!canAdmin}
          />
          <input
            value={form.floor}
            onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
            placeholder="Floor"
            className={`rounded-md input-glass px-3 py-2 text-sm ${formErrors.floor ? "border-rose-500/60" : ""}`}
            disabled={!canAdmin}
          />
        </div>
        <input
          value={form.facing}
          onChange={(e) => setForm((prev) => ({ ...prev, facing: e.target.value }))}
          placeholder="Facing"
          className="rounded-md input-glass px-3 py-2 text-sm"
          disabled={!canAdmin}
        />
        <button
          onClick={submitCreate}
          disabled={saving || !canAdmin}
          className="btn-primary px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!canAdmin ? "Admin only" : saving ? "Saving..." : "Add Unit"}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-secondary">Loading...</div>
      ) : emptyState ? (
        <EmptyState title="No units yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl card-glass border border-theme bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-white/10 text-sm table-surface">
            <thead className="bg-surface text-left text-xs font-semibold text-secondary">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((unit) => {
                const isEditing = editId === unit.id;
                return (
                  <tr key={unit.id} className="hover:bg-surface">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={editForm.type || ""}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, type: e.target.value }))}
                          className={`w-full rounded-md input-glass px-2 py-1 text-xs ${editErrors.type ? "border-rose-500/60" : ""}`}
                        />
                      ) : (
                        <div className="font-semibold text-primary">{unit.type || "-"}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {isEditing ? (
                        <input
                          value={editForm.areaSqFt || ""}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, areaSqFt: e.target.value }))}
                          className={`w-full rounded-md input-glass px-2 py-1 text-xs ${editErrors.areaSqFt ? "border-rose-500/60" : ""}`}
                        />
                      ) : (
                        unit.areaSqFt || unit.carpetSqFt || unit.builtUpSqFt || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {isEditing ? (
                        <input
                          value={editForm.price || ""}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, price: e.target.value }))}
                          className={`w-full rounded-md input-glass px-2 py-1 text-xs ${editErrors.price ? "border-rose-500/60" : ""}`}
                        />
                      ) : (
                        unit.price || "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.availability || "available"}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, availability: e.target.value }))}
                          className="rounded-md input-glass px-2 py-1 text-xs"
                        >
                          {availabilityOptions.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge tone={toneForStatus(unit.availability)}>{unit.availability}</StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary">{formatDateTime(unit.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              className="rounded-md btn-primary px-2.5 py-1 text-xs font-semibold"
                              onClick={saveEdit}
                            >
                              Save
                            </button>
                            <button
                              className="rounded-md border border-theme px-2.5 py-1 text-xs font-semibold text-secondary hover-border-strong"
                              onClick={() => {
                                setEditId(null);
                                setEditForm({});
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="rounded-md border border-theme px-2.5 py-1 text-xs font-semibold text-secondary hover-border-strong"
                              onClick={() => startEdit(unit)}
                              disabled={!canAdmin}
                              title={!canAdmin ? "Admin only" : undefined}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-md border border-rose-500/40 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                              onClick={() => removeUnit(unit.id)}
                              disabled={saving || !canAdmin}
                              title={!canAdmin ? "Admin only" : undefined}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
