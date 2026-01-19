type Props = {
  state: any;
  cityLabel?: string;
};

export default function ReviewStep({ state, cityLabel }: Props) {
  const rows: Array<[string, string]> = [
    ["City", cityLabel || state.citySlug],
    ["Intent", state.intent],
    ["Category", state.property.category],
    ["Type", state.property.category === "land" ? "plot" : state.property.type],
    ["Budget", budgetText(state.budget)],
    ["Locality", state.localityText],
    ["Must haves", state.mustHaves.join(", ") || "-"],
    ["Deal breakers", state.dealBreakers.join(", ") || "-"],
    ["Buyer phone", state.buyer.phone],
    ["Preferred call time", state.buyer.preferredCallTime || "Anytime"]
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-primary">Review your request</div>
      <div className="rounded-lg input-glass bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
            <div className="text-secondary">{label}</div>
            <div className="col-span-2 font-semibold text-primary">{value}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted">
        You consent to be contacted and to share details with our property advisors. Requests are routed to our team in
        your city.
      </div>
    </div>
  );
}

function budgetText(budget: { min?: number; max?: number }) {
  if (budget.min && budget.max) return `INR ${budget.min} - ${budget.max}`;
  if (budget.min) return `From INR ${budget.min}`;
  if (budget.max) return `Up to INR ${budget.max}`;
  return "Not specified";
}





