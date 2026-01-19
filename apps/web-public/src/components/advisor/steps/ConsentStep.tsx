type Consent = { granted: boolean; partnerShare: boolean };

type Props = {
  value: Consent;
  onChange: (v: Consent) => void;
};

export default function ConsentStep({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-secondary">
        To help you find the right property, we need your consent to contact you and share details with our authorized real estate professionals.
      </p>
      <label className="flex items-start gap-2 text-sm text-primary">
        <input
          type="checkbox"
          checked={value.granted}
          onChange={(e) => onChange({ ...value, granted: e.target.checked })}
          className="mt-1"
        />
        <span>I agree to be contacted and understand my details will be shared with our property advisors.</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-primary">
        <input
          type="checkbox"
          checked={value.partnerShare}
          onChange={(e) => onChange({ ...value, partnerShare: e.target.checked })}
          className="mt-1"
        />
        <span>Allow sharing with our team for follow-up.</span>
      </label>
    </div>
  );
}





