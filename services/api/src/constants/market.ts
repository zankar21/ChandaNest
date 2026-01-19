export const TARGET_CITY_SLUGS = ["chandrapur", "gadchiroli", "nagpur", "wardha", "yavatmal"] as const;
export type TargetCitySlug = (typeof TARGET_CITY_SLUGS)[number];

export const TARGET_CITIES: Record<TargetCitySlug, { slug: TargetCitySlug; name: string; state: "Maharashtra" }> = {
  chandrapur: { slug: "chandrapur", name: "Chandrapur", state: "Maharashtra" },
  gadchiroli: { slug: "gadchiroli", name: "Gadchiroli", state: "Maharashtra" },
  nagpur: { slug: "nagpur", name: "Nagpur", state: "Maharashtra" },
  wardha: { slug: "wardha", name: "Wardha", state: "Maharashtra" },
  yavatmal: { slug: "yavatmal", name: "Yavatmal", state: "Maharashtra" }
};

export const FIXED_PARTNER = {
  id: "chandrapur-real-estate-solutions",
  name: "Chandrapur Real Estate Solutions Pvt Ltd"
};

export function isTargetCitySlug(x: string): x is TargetCitySlug {
  return (TARGET_CITY_SLUGS as readonly string[]).includes(x);
}
