type BuyerContact = { name?: string; phone: string; preferredCallTime?: string };

type Props = {
  buyer: BuyerContact;
  onChange: (buyer: BuyerContact) => void;
};

export default function ContactStep({ buyer, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-primary">Contact details</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-secondary">Name (optional)</label>
          <input
            value={buyer.name || ""}
            onChange={(e) => onChange({ ...buyer, name: e.target.value })}
            className="w-full rounded-md input-glass px-3 py-2 text-sm"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-secondary">Phone (required)</label>
          <input
            value={buyer.phone}
            onChange={(e) => onChange({ ...buyer, phone: e.target.value })}
            className="w-full rounded-md input-glass px-3 py-2 text-sm"
            placeholder="10-digit phone"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-secondary">Preferred call time (optional)</label>
        <input
          value={buyer.preferredCallTime || ""}
          onChange={(e) => onChange({ ...buyer, preferredCallTime: e.target.value })}
          className="w-full rounded-md input-glass px-3 py-2 text-sm"
          placeholder="e.g., 4-6pm"
        />
      </div>
    </div>
  );
}





