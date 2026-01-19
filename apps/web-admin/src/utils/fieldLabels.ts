type FieldSection =
  | "Basics"
  | "Location"
  | "Specs"
  | "Pricing"
  | "Contact"
  | "Media";

const LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  intent: "Intent",
  category: "Category",
  propertyType: "Property type",
  subType: "Property type",
  saleType: "Sale type",
  landUse: "Land use",
  "landRecord.mouza": "Mouza",
  "landRecord.surveyOrGatNo": "Survey / Gat No",
  "landRecord.taluka": "Tehsil (Taluka)",
  "landRecord.district": "District",
  "area.value": "Area value",
  "area.unit": "Area unit",
  "specs.flat.bhk": "BHK",
  "specs.flat.bathrooms": "Bathrooms",
  "specs.flat.carpetAreaSqFt": "Carpet area (sq.ft)",
  "location.citySlug": "City",
  "location.locality": "Locality",
  "location.addressLine": "Address",
  "location.pincode": "Pincode",
  "location.geo.lat": "Latitude",
  "location.geo.lng": "Longitude",
  "pricing.totalPrice": "Total price",
  "pricing.pricePerSqFt": "Rate per sq.ft",
  "pricing.rentPerMonth": "Monthly rent",
  "pricing.leaseAmount": "Lease amount",
  "pricing.leasePerMonth": "Lease per month",
  "contact.phone": "Contact phone",
  "contact.name": "Contact name",
  "contact.email": "Contact email",
  "media.hero": "Hero photo",
  "media.gallery": "Gallery photo"
};

const SECTIONS: Record<string, FieldSection> = {
  intent: "Basics",
  category: "Basics",
  propertyType: "Basics",
  subType: "Basics",
  title: "Basics",
  description: "Basics",
  saleType: "Basics",
  landUse: "Specs",
  "landRecord.mouza": "Specs",
  "landRecord.surveyOrGatNo": "Specs",
  "landRecord.taluka": "Specs",
  "landRecord.district": "Specs",
  "area.value": "Specs",
  "area.unit": "Specs",
  "specs.flat.bhk": "Specs",
  "specs.flat.bathrooms": "Specs",
  "specs.flat.carpetAreaSqFt": "Specs",
  "location.citySlug": "Location",
  "location.locality": "Location",
  "location.addressLine": "Location",
  "location.pincode": "Location",
  "location.geo.lat": "Location",
  "location.geo.lng": "Location",
  "pricing.totalPrice": "Pricing",
  "pricing.pricePerSqFt": "Pricing",
  "pricing.rentPerMonth": "Pricing",
  "pricing.leaseAmount": "Pricing",
  "pricing.leasePerMonth": "Pricing",
  "contact.phone": "Contact",
  "contact.name": "Contact",
  "contact.email": "Contact",
  "media.hero": "Media",
  "media.gallery": "Media"
};

function prettifyPath(path: string) {
  if (!path) return "Missing field";
  return path
    .split(".")
    .map((part) => part.replace(/([A-Z])/g, " $1"))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" › ");
}

export function friendlyFieldLabel(path: string): string {
  return LABELS[path] || prettifyPath(path);
}

export function fieldSection(path: string): FieldSection {
  return SECTIONS[path] || "Basics";
}
