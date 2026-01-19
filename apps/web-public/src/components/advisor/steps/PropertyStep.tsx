type Props = {
  category: string;
  type: string;
  bhk?: number;
  categories: readonly string[];
  types: readonly string[];
  onChange: (next: { category: string; type: string; bhk?: number }) => void;
};

const DEFAULT_LAND_TYPE = "plot";

export default function PropertyStep({ category, type, bhk, categories, types, onChange }: Props) {
  const showTypePicker = category !== "land";

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-primary">Category</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                onChange({
                  category: c,
                  type: c === "land" ? DEFAULT_LAND_TYPE : type || ""
                })
              }
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                category === c
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-theme text-primary hover-border-strong"
              }`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {showTypePicker ? (
        <div>
          <div className="text-sm font-semibold text-primary">Type</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ category, type: t, bhk })}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  type === t
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-theme text-primary hover-border-strong"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-secondary">
          Land default type: <span className="font-semibold">Plot</span>
        </div>
      )}

      {category === "residential" && (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-primary">BHK (optional)</div>
          <input
            type="number"
            min={1}
            className="w-full rounded-md input-glass px-3 py-2 text-sm"
            value={bhk ?? ""}
            onChange={(e) => onChange({ category, type, bhk: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="e.g., 2"
          />
        </div>
      )}
    </div>
  );
}





