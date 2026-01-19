export function slugify(text: string) {
  return (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPropertySeo(property: any) {
  const city = property?.location?.city || property?.location?.citySlug || "city";
  const locality = property?.location?.locality || "locality";
  const type = property?.propertyType || "property";
  const listingType = property?.type || "sale";
  const area = property?.area?.value ?? null;
  const areaUnit = property?.area?.unit || "";
  const areaText = area ? `${area}` : "";
  const areaWithUnit = area && areaUnit ? `${area} ${areaUnit}` : areaText;

  const citySlug = slugify(city);
  const localitySlug = slugify(locality);
  const typeSlug = slugify(type);

  const seoSlugParts = [];
  if (areaText) seoSlugParts.push(`${areaText}-${areaUnit || "sqft"}`);
  seoSlugParts.push(typeSlug || "property");
  seoSlugParts.push("in");
  seoSlugParts.push(localitySlug || "locality");
  const seoSlug = slugify(seoSlugParts.join("-"));

  const canonicalPath = `/property/${citySlug || "city"}/${localitySlug || "locality"}/${seoSlug || "listing"}`;

  const title = `${areaWithUnit ? `${areaWithUnit} ` : ""}${type} for ${
    listingType === "rent" ? "Rent" : "Sale"
  } in ${locality}, ${city} | ChandaNest`;
  const description = `Find ${areaWithUnit ? `${areaWithUnit} ` : ""}${type} in ${locality}, ${city}. View photos, location & contact on ChandaNest.`;

  const keywords = [
    type && city ? `${type} in ${city}` : null,
    type && locality ? `${type} in ${locality}` : null,
    type === "plot" && city ? `land for sale in ${city}` : null,
    areaWithUnit && type === "plot" ? `${areaWithUnit} plot` : null,
    "ChandaNest"
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    canonicalPath
  };
}

export function buildLandingSeo(input: { city: string; locality?: string; count?: number }) {
  const city = input.city || "city";
  const locality = input.locality || "";
  const citySlug = slugify(city);
  const localitySlug = locality ? slugify(locality) : "";

  const isLocality = Boolean(locality);
  const title = isLocality
    ? `Properties for Sale in ${locality}, ${city} | ChandaNest`
    : `Properties for Sale in ${city} | Land, Flats, Rentals | ChandaNest`;

  const description = isLocality
    ? `Browse verified properties for sale in ${locality}, ${city}. Explore land/plots, flats and rentals with photos, pricing and location on ChandaNest.`
    : `Browse verified properties for sale in ${city}, Maharashtra. Explore land/plots, flats and rentals with photos, pricing and location on ChandaNest.`;

  const keywords = isLocality
    ? [
        `properties in ${locality} ${city}`,
        `land for sale in ${locality}`,
        `plots in ${locality}`,
        "ChandaNest"
      ]
    : [
        `properties in ${city}`,
        `land for sale in ${city}`,
        `plots in ${city}`,
        `flats in ${city}`,
        `rental in ${city}`,
        "ChandaNest"
      ];

  const canonicalPath = isLocality
    ? `/properties/${citySlug}/${localitySlug}`
    : `/properties/${citySlug}`;

  return {
    title,
    description,
    keywords,
    canonicalPath,
    count: input.count ?? 0
  };
}
