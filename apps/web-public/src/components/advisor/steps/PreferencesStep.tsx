import { useState } from "react";

type Props = {
  localityText: string;
  mustHaves: string[];
  dealBreakers: string[];
  onChange: (next: { localityText: string; mustHaves: string[]; dealBreakers: string[] }) => void;
};

export default function PreferencesStep({ localityText, mustHaves, dealBreakers, onChange }: Props) {
  const addChip = (key: "mustHaves" | "dealBreakers", value: string) => {
    if (!value.trim()) return;
    const list = key === "mustHaves" ? mustHaves : dealBreakers;
    if (list.includes(value.trim())) return;
    onChange({
      localityText,
      mustHaves: key === "mustHaves" ? [...mustHaves, value.trim()] : mustHaves,
      dealBreakers: key === "dealBreakers" ? [...dealBreakers, value.trim()] : dealBreakers
    });
  };

  const removeChip = (key: "mustHaves" | "dealBreakers", value: string) => {
    onChange({
      localityText,
      mustHaves: key === "mustHaves" ? mustHaves.filter((c) => c !== value) : mustHaves,
      dealBreakers: key === "dealBreakers" ? dealBreakers.filter((c) => c !== value) : dealBreakers
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-primary">Preferred locality</div>
        <input
          value={localityText}
          onChange={(e) => onChange({ localityText: e.target.value, mustHaves, dealBreakers })}
          className="mt-2 w-full rounded-md input-glass px-3 py-2 text-sm"
          placeholder="e.g., near station"
        />
      </div>

      <ChipInput
        label="Must haves"
        values={mustHaves}
        onAdd={(v) => addChip("mustHaves", v)}
        onRemove={(v) => removeChip("mustHaves", v)}
      />

      <ChipInput
        label="Deal breakers"
        values={dealBreakers}
        onAdd={(v) => addChip("dealBreakers", v)}
        onRemove={(v) => removeChip("dealBreakers", v)}
      />
    </div>
  );
}

function ChipInput({
  label,
  values,
  onAdd,
  onRemove
}: {
  label: string;
  values: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-primary">{label}</div>
      <div className="flex gap-2">
        <input
          className="w-full rounded-md input-glass px-3 py-2 text-sm"
          placeholder="Add item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(draft);
              setDraft("");
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            onAdd(draft);
            setDraft("");
          }}
          className="rounded-md input-glass px-3 py-2 text-sm font-semibold text-primary hover-border-strong"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-primary"
          >
            {v}
            <button
              type="button"
              onClick={() => onRemove(v)}
              className="text-muted hover:text-rose-200"
            >
              x
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}





