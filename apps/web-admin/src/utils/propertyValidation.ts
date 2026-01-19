export type ChecklistItem = { key: string; label: string; ok: boolean; scrollToId: string };

function hasMedia(property: any) {
  const heroPath = property?.media?.hero?.objectPath;
  const gallery = Array.isArray(property?.media?.gallery) ? property.media.gallery : [];
  const galleryHasPath = gallery.some((g: any) => Boolean(g?.objectPath));
  return Boolean(heroPath || galleryHasPath);
}

export function validationChecklist(property: any): ChecklistItem[] {
  const title = property?.listing?.title || property?.name;
  const city = property?.location?.city || property?.location?.citySlug;
  const locality = property?.location?.locality;
  const amount = property?.pricing?.totalPrice ?? property?.pricing?.price ?? property?.pricing?.amount;
  const propertyType = property?.propertyType;
  const areaValue = property?.area?.value;
  const areaUnit = property?.area?.unit;
  const landRecord = property?.landRecord || {};

  const items: ChecklistItem[] = [
    { key: "title", label: "Title / Name", ok: Boolean(title), scrollToId: "section-title" },
    {
      key: "location",
      label: "Location (city or locality)",
      ok: Boolean(city || locality),
      scrollToId: "section-location"
    },
    { key: "pricing", label: "Pricing", ok: amount !== null && amount !== undefined, scrollToId: "section-pricing" },
    { key: "media", label: "At least one image", ok: hasMedia(property), scrollToId: "section-media" }
  ];

  if (propertyType === "land") {
    items.push({
      key: "land-records",
      label: "Land records (Mouza, Survey / Gat No, Tehsil, District)",
      ok: Boolean(landRecord.mouza && landRecord.surveyOrGatNo && landRecord.taluka && landRecord.district),
      scrollToId: "section-land-records"
    });
    items.push({
      key: "land-area",
      label: "Land area (value + unit)",
      ok: Boolean(areaValue && areaUnit),
      scrollToId: "section-land-records"
    });
  }

  return items;
}

export function canSubmit(property: any) {
  return validationChecklist(property).every((item) => item.ok);
}

export function canPublish(property: any) {
  return validationChecklist(property).every((item) => item.ok);
}
