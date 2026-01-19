export function getHeroObjectPath(listing: any): string | null {
  if (!listing) return null;
  const hero = listing.media?.hero?.objectPath;
  if (typeof hero === "string" && hero) return hero;
  const firstGallery = listing.media?.gallery?.[0]?.objectPath;
  if (typeof firstGallery === "string" && firstGallery) return firstGallery;
  return null;
}
