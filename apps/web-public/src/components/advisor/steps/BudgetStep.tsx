type Props = {
  budget: { min?: number; max?: number };
  onChange: (budget: { min?: number; max?: number }) => void;
};

export default function BudgetStep({ budget, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-primary">Budget (INR)</div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          className="w-full rounded-md input-glass px-3 py-2 text-sm"
          placeholder="Min"
          value={budget.min ?? ""}
          onChange={(e) =>
            onChange({
              ...budget,
              min: e.target.value === "" ? undefined : Number(e.target.value)
            })
          }
        />
        <input
          type="number"
          min={0}
          className="w-full rounded-md input-glass px-3 py-2 text-sm"
          placeholder="Max"
          value={budget.max ?? ""}
          onChange={(e) =>
            onChange({
              ...budget,
              max: e.target.value === "" ? undefined : Number(e.target.value)
            })
          }
        />
      </div>
      <div className="text-xs text-muted">We will use your range to shortlist properties.</div>
    </div>
  );
}





