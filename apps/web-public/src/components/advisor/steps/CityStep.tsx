import { TARGET_CITIES, TARGET_CITY_SLUGS } from "../../../constants/market";

type Props = {
  value: string;
  onChange: (val: string) => void;
};

export default function CityStep({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-primary">Select city</div>
      <select
        className="w-full rounded-md input-glass px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose a city</option>
        {TARGET_CITY_SLUGS.map((slug) => (
          <option key={slug} value={slug}>
            {TARGET_CITIES[slug].name}
          </option>
        ))}
      </select>
    </div>
  );
}





