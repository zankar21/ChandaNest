type Props = {
  value: string;
  onChange: (val: any) => void;
};

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "invest", label: "Invest" },
  { value: "lease", label: "Lease" },
  { value: "other", label: "Other" }
];

export default function IntentStep({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-primary">What is your intent?</div>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              value === opt.value
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-theme text-primary hover-border-strong"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}





