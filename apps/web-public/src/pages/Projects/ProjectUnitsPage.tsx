import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  publicGetProject,
  publicListProjectUnits,
  type PublicProject,
  type PublicProjectUnit
} from "../../services/apiClient";

function formatMoney(value?: number) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function buildAreaLabel(unit: PublicProjectUnit) {
  if (unit.carpetSqFt) return `${unit.carpetSqFt} sqft carpet`;
  if (unit.builtUpSqFt) return `${unit.builtUpSqFt} sqft built-up`;
  if (unit.areaSqFt) return `${unit.areaSqFt} sqft`;
  return "-";
}

export default function ProjectUnitsPage() {
  const { slug } = useParams();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [units, setUnits] = useState<PublicProjectUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slugValue = slug ?? "";
    if (!slugValue) {
      setLoading(false);
      setError("Missing project slug");
      return;
    }
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [projectData, unitsData] = await Promise.all([
          publicGetProject(slugValue),
          publicListProjectUnits(slugValue)
        ]);
        if (!active) return;
        setProject(projectData);
        setUnits(unitsData.items || []);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load units");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const locationLine = useMemo(() => {
    if (!project?.location) return null;
    const { area, city, addressLine } = project.location;
    return [area, city, addressLine].filter(Boolean).join(", ");
  }, [project]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 rounded-2xl bg-surface animate-pulse" />
        <div className="h-24 rounded-2xl bg-surface animate-pulse" />
        <div className="h-64 rounded-2xl bg-surface animate-pulse" />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;
  if (!project) return null;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{project.name} units | ChandaNest Projects</title>
        <meta
          name="description"
          content={`Browse available units in ${project.name} located in ${project.location?.city || "India"}.`}
        />
      </Helmet>

      <div className="card-glass border border-theme p-6 shadow-sm space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-secondary">Units in</div>
            <div className="text-2xl font-semibold text-primary">{project.name}</div>
            <div className="text-sm text-secondary">{locationLine || "Location pending"}</div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/projects/${project.slug}`}
              className="rounded-full border border-theme px-4 py-2 text-xs font-semibold text-secondary"
            >
              Project details
            </Link>
            <Link
              to={`/projects/${project.slug}?enquire=1&source=project`}
              className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Enquire
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-secondary">
          <span className="rounded-full border border-theme px-3 py-1">
            {project.counts?.availableUnits ?? "-"} available
          </span>
          <span className="rounded-full border border-theme px-3 py-1">
            {project.counts?.totalUnits ?? "-"} total
          </span>
          <span className="rounded-full border border-theme px-3 py-1">
            {project.status || "Status pending"}
          </span>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="card-glass border border-theme p-6 text-center text-sm text-secondary">
          No units are available yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-theme">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface/60 text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Floor</th>
                <th className="px-4 py-3">Facing</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-t border-theme bg-surface/30">
                  <td className="px-4 py-3 font-semibold text-primary">{unit.unitId}</td>
                  <td className="px-4 py-3 text-secondary">{unit.type || "-"}</td>
                  <td className="px-4 py-3 text-secondary">{buildAreaLabel(unit)}</td>
                  <td className="px-4 py-3 text-secondary">{unit.floor ?? "-"}</td>
                  <td className="px-4 py-3 text-secondary">{unit.facing || "-"}</td>
                  <td className="px-4 py-3 text-secondary">{unit.availability || "-"}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatMoney(unit.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
