type FieldSection =
  | "Land Records"
  | "Area"
  | "Location"
  | "Pricing"
  | "Rental"
  | "Contact"
  | "Photos"
  | "Other";

const LABELS: Record<string, string> = {
  "landRecord.mouza": "Mouza",
  "landRecord.surveyOrGatNo": "Survey / Gat No",
  "landRecord.taluka": "Tehsil (Taluka)",
  "landRecord.district": "District",
  "area.value": "Area value",
  "area.unit": "Area unit",
  "location.citySlug": "City",
  "location.locality": "Locality",
  "location.addressLine": "Address",
  "location.pincode": "Pincode",
  "pricing.totalPrice": "Total price",
  "pricing.pricePerSqFt": "Rate per sq.ft",
  "pricing.rentPerMonth": "Monthly rent",
  "pricing.leaseAmount": "Lease amount",
  "pricing.leasePerMonth": "Lease per month",
  "rental.leaseTermMonths": "Lease term (months)",
  "rental.availableFrom": "Available from",
  "rental.maintenance": "Maintenance",
  "rental.maintenanceIncluded": "Maintenance included",
  "rental.preferredTenants": "Preferred tenants",
  "rental.petsAllowed": "Pets allowed",
  "contact.phone": "Contact phone",
  "contact.name": "Contact name",
  "contact.email": "Contact email",
  "media.hero": "Hero photo",
  "media.gallery": "Gallery photo"
};

const SECTIONS: Record<string, FieldSection> = {
  "landRecord.mouza": "Land Records",
  "landRecord.surveyOrGatNo": "Land Records",
  "landRecord.taluka": "Land Records",
  "landRecord.district": "Land Records",
  "area.value": "Area",
  "area.unit": "Area",
  "location.citySlug": "Location",
  "location.locality": "Location",
  "location.addressLine": "Location",
  "location.pincode": "Location",
  "pricing.totalPrice": "Pricing",
  "pricing.pricePerSqFt": "Pricing",
  "pricing.rentPerMonth": "Pricing",
  "pricing.leaseAmount": "Pricing",
  "pricing.leasePerMonth": "Pricing",
  "rental.leaseTermMonths": "Rental",
  "rental.availableFrom": "Rental",
  "rental.maintenance": "Rental",
  "rental.maintenanceIncluded": "Rental",
  "rental.preferredTenants": "Rental",
  "rental.petsAllowed": "Rental",
  "contact.phone": "Contact",
  "contact.name": "Contact",
  "contact.email": "Contact",
  "media.hero": "Photos",
  "media.gallery": "Photos"
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
  return SECTIONS[path] || "Other";
}
