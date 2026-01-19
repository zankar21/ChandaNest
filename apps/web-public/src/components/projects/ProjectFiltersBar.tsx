import React from "react";

type Filters = {
  city: string;
  q: string;
  type: string;
  status: string;
  minPrice: string;
  maxPrice: string;
};

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
  onApply: () => void;
  onReset: () => void;
};

export default function ProjectFiltersBar({ value, onChange, onApply, onReset }: Props) {
  const update = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <div className="card-glass border border-theme p-4 shadow-sm space-y-3">
      <div className="grid gap-3 md:grid-cols-6">
        <input
          value={value.city}
          onChange={(e) => update({ city: e.target.value })}
          placeholder="City"
          className="rounded-md input-glass px-3 py-2 text-sm md:col-span-2"
        />
        <input
          value={value.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search projects"
          className="rounded-md input-glass px-3 py-2 text-sm md:col-span-2"
        />
        <select
          value={value.type}
          onChange={(e) => update({ type: e.target.value })}
          className="rounded-md input-glass px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="apartment">Apartment</option>
          <option value="plot">Plot</option>
          <option value="commercial">Commercial</option>
          <option value="mixed">Mixed</option>
        </select>
        <select
          value={value.status}
          onChange={(e) => update({ status: e.target.value })}
          className="rounded-md input-glass px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="planning">Planning</option>
          <option value="under_construction">Under construction</option>
          <option value="ready">Ready</option>
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={value.minPrice}
          onChange={(e) => update({ minPrice: e.target.value })}
          placeholder="Min price (INR)"
          className="rounded-md input-glass px-3 py-2 text-sm"
        />
        <input
          value={value.maxPrice}
          onChange={(e) => update({ maxPrice: e.target.value })}
          placeholder="Max price (INR)"
          className="rounded-md input-glass px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2 md:col-span-2">
          <button className="btn-primary px-4 py-2 text-sm font-semibold" onClick={onApply}>
            Apply filters
          </button>
          <button className="rounded-md border border-theme px-4 py-2 text-sm font-semibold text-secondary hover-border-strong" onClick={onReset}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
