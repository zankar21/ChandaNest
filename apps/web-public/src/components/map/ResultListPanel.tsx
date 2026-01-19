type MapItem = {
  id: string;
  kind: "property" | "project";
  title: string;
  priceLabel?: string;
  city?: string;
  area?: string;
  thumbUrl?: string;
  href: string;
  lat?: number;
  lng?: number;
};

type Props = {
  activeTab: "properties" | "projects";
  onTabChange: (value: "properties" | "projects") => void;
  properties: MapItem[];
  projects: MapItem[];
  propertiesInBounds: MapItem[];
  projectsInBounds: MapItem[];
  propertiesNoPin: MapItem[];
  projectsNoPin: MapItem[];
  selectedId?: string | null;
  onSelectItem: (item: MapItem) => void;
};

function ListItem({
  item,
  selected,
  onSelect
}: {
  item: MapItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        selected ? "border-indigo-500/60 bg-surface/70" : "border-theme bg-surface/40 hover-border-strong"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-primary line-clamp-1">{item.title}</div>
        {!item.lat || !item.lng ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
            No pin
          </span>
        ) : null}
      </div>
      <div className="mt-1 text-xs text-secondary">{[item.area, item.city].filter(Boolean).join(", ") || "Location pending"}</div>
      <div className="mt-2 text-sm font-semibold text-primary">{item.priceLabel || "Price on request"}</div>
    </button>
  );
}

export default function ResultListPanel({
  activeTab,
  onTabChange,
  properties,
  projects,
  propertiesInBounds,
  projectsInBounds,
  propertiesNoPin,
  projectsNoPin,
  selectedId,
  onSelectItem
}: Props) {
  const isProperties = activeTab === "properties";
  const list = isProperties ? propertiesInBounds : projectsInBounds;
  const noPin = isProperties ? propertiesNoPin : projectsNoPin;
  const total = isProperties ? properties.length : projects.length;
  const inBoundsCount = list.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onTabChange("properties")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isProperties ? "bg-indigo-600 text-white" : "border border-theme text-secondary"
          }`}
        >
          Properties ({properties.length})
        </button>
        <button
          type="button"
          onClick={() => onTabChange("projects")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            !isProperties ? "bg-emerald-500 text-white" : "border border-theme text-secondary"
          }`}
        >
          Projects ({projects.length})
        </button>
        <span className="ml-auto text-xs text-secondary">{inBoundsCount} in view</span>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface/40 p-4 text-sm text-secondary">
          No results for current filters.
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-theme bg-surface/40 p-4 text-sm text-secondary">
          No pinned results in this area. Try zooming out or changing filters.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <ListItem key={item.id} item={item} selected={selectedId === item.id} onSelect={() => onSelectItem(item)} />
          ))}
        </div>
      )}

      {noPin.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted">No pin on map</div>
          <div className="space-y-2">
            {noPin.map((item) => (
              <ListItem key={item.id} item={item} selected={selectedId === item.id} onSelect={() => onSelectItem(item)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
