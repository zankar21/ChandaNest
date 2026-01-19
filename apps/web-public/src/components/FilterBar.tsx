import { useEffect, useMemo, useState } from "react";
import { Filters, defaultFilters } from "../pages/PropertyList/filters";

type Option = { label: string; value: string };

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  typeOptions: Option[];
  statusOptions: Option[];
  cityOptions: Option[];
};

export default function FilterBar({ filters, onChange, typeOptions, statusOptions, cityOptions }: Props) {
  const [qInput, setQInput] = useState(filters.q);

  useEffect(() => {
    setQInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (qInput !== filters.q) {
        onChange({ ...filters, q: qInput });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [qInput, filters, onChange]);

  const clearAll = () => onChange({ ...defaultFilters });

  const moreFiltersOpen = useMemo(
    () =>
      filters.minPrice !== null ||
      filters.maxPrice !== null ||
      filters.minArea !== null ||
      filters.maxArea !== null,
    [filters.minArea, filters.maxArea, filters.minPrice, filters.maxPrice]
  );

  return (
    <div className="rounded-2xl card-glass border border-theme bg-surface p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1 flex items-center gap-2 rounded-full border border-theme px-3 py-2">
          <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
          </svg>
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search by title, city, locality"
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted outline-none"
          />
        </div>

        <Select
          label="Type"
          value={filters.type}
          onChange={(v) => onChange({ ...filters, type: v })}
          options={[{ label: "All", value: "" }, ...typeOptions]}
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(v) => onChange({ ...filters, status: v })}
          options={[{ label: "All", value: "" }, ...statusOptions]}
        />
        {cityOptions.length > 0 && (
          <Select
            label="City"
            value={filters.city}
            onChange={(v) => onChange({ ...filters, city: v })}
            options={[{ label: "All", value: "" }, ...cityOptions]}
          />
        )}
        <Select
          label="Sort"
          value={filters.sort}
          onChange={(v) => onChange({ ...filters, sort: v as Filters["sort"] })}
          options={[
            { label: "Newest", value: "newest" },
            { label: "Price ↑", value: "price_asc" },
            { label: "Price ↓", value: "price_desc" },
            { label: "Area ↑", value: "area_asc" },
            { label: "Area ↓", value: "area_desc" }
          ]}
        />
        <button
          onClick={clearAll}
          className="rounded-full border border-theme px-3 py-2 text-sm font-semibold text-secondary hover-border-strong hover:text-primary transition"
        >
          Clear
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NumberInput
          label="Min Price"
          value={filters.minPrice ?? ""}
          onChange={(v) => onChange({ ...filters, minPrice: v })}
        />
        <NumberInput
          label="Max Price"
          value={filters.maxPrice ?? ""}
          onChange={(v) => onChange({ ...filters, maxPrice: v })}
        />
        <NumberInput
          label="Min Area"
          value={filters.minArea ?? ""}
          onChange={(v) => onChange({ ...filters, minArea: v })}
        />
        <NumberInput
          label="Max Area"
          value={filters.maxArea ?? ""}
          onChange={(v) => onChange({ ...filters, maxArea: v })}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <label className="text-xs text-secondary flex flex-col gap-1">
      <span className="hidden md:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full input-glass px-3 py-2 text-sm font-medium focus:border-indigo-300 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value || opt.label} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number | "" | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="text-xs text-secondary flex flex-col gap-1">
      <span>{label}</span>
      <input
        type="number"
        value={value === null ? "" : value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === "" ? null : Number(val));
        }}
        className="rounded-lg input-glass bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-indigo-300"
        placeholder="Any"
      />
    </label>
  );
}





