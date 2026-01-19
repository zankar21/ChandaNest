type Option = { label: string; value: string };

type Props = {
  city: string;
  onCityChange: (value: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  propertyType: string;
  onPropertyTypeChange: (value: string) => void;
  projectType: string;
  onProjectTypeChange: (value: string) => void;
  projectStatus: string;
  onProjectStatusChange: (value: string) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  showProperties: boolean;
  showProjects: boolean;
  onToggleProperties: () => void;
  onToggleProjects: () => void;
  onReset: () => void;
  cityOptions: Option[];
  propertyTypeOptions: Option[];
  projectTypeOptions: Option[];
  projectStatusOptions: Option[];
};

export default function MapFiltersBar({
  city,
  onCityChange,
  query,
  onQueryChange,
  propertyType,
  onPropertyTypeChange,
  projectType,
  onProjectTypeChange,
  projectStatus,
  onProjectStatusChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  showProperties,
  showProjects,
  onToggleProperties,
  onToggleProjects,
  onReset,
  cityOptions,
  propertyTypeOptions,
  projectTypeOptions,
  projectStatusOptions
}: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-theme bg-surface/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleProperties}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            showProperties ? "bg-indigo-600 text-white" : "border border-theme text-secondary"
          }`}
        >
          Properties
        </button>
        <button
          type="button"
          onClick={onToggleProjects}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            showProjects ? "bg-emerald-500 text-white" : "border border-theme text-secondary"
          }`}
        >
          Projects
        </button>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-full border border-theme px-3 py-1 text-xs font-semibold text-secondary"
        >
          Reset filters
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-secondary">City</label>
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          >
            {cityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary">Search</label>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Area, landmark, builder"
            className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          />
        </div>
        <div>
          <label className="text-xs text-secondary">Property type</label>
          <select
            value={propertyType}
            onChange={(e) => onPropertyTypeChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          >
            <option value="">All</option>
            {propertyTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary">Project type</label>
          <select
            value={projectType}
            onChange={(e) => onProjectTypeChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          >
            <option value="">All</option>
            {projectTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-secondary">Project status</label>
          <select
            value={projectStatus}
            onChange={(e) => onProjectStatusChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
          >
            <option value="">All</option>
            {projectStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-secondary">Min price</label>
            <input
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
            />
          </div>
          <div>
            <label className="text-xs text-secondary">Max price</label>
            <input
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              placeholder="10000000"
              className="mt-1 w-full rounded-md border border-theme bg-surface px-3 py-2 text-sm text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
