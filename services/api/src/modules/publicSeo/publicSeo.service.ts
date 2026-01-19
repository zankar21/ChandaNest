import { firestore } from "../../config/firebase";
import { env } from "../../config/env";
import { TARGET_CITIES, TARGET_CITY_SLUGS, type TargetCitySlug, isTargetCitySlug } from "../../constants/market";

const BASE_URL = (env.publicWebBaseUrl || "https://www.chandanest.in").replace(/\/+$/, "");

export function isValidCitySlug(slug: string): slug is TargetCitySlug {
  return isTargetCitySlug(slug);
}

export function buildCitySeo(citySlug: TargetCitySlug) {
  const city = TARGET_CITIES[citySlug];
  const title = `${city.name} Real Estate | Buy, Rent, Invest | ChandaNest`;
  const description = `Discover verified properties and local insights in ${city.name}, ${city.state}. Work with our advisors to buy, rent, or invest.`;
  const canonical = `${BASE_URL}/cities/${city.slug}`;
  const ogImage = `${BASE_URL}/og/cities/${city.slug}.png`;
  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogImage
  };
}

export async function generateSitemapXml() {
  const urls: string[] = [];
  const now = new Date().toISOString();

  // City URLs
  TARGET_CITY_SLUGS.forEach((slug) => {
    urls.push(
      `<url><loc>${BASE_URL}/cities/${slug}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`
    );
  });

  // Properties
  const snap = await firestore.collection("publicProperties").get();
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const loc = `${BASE_URL}/p/${doc.id}`;
    const featured = data.featured === true;
    const priority = featured ? "0.9" : "0.6";
    const lastmod =
      data.updatedAt?.toDate?.() instanceof Date ? data.updatedAt.toDate().toISOString() : now;
    urls.push(
      `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority></url>`
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.join("") +
    `</urlset>`;
}

export function robotsTxt() {
  return [
    "User-agent: *",
    "Allow: /cities",
    "Allow: /properties",
    "Disallow: /admin",
    "Disallow: /api",
    "Sitemap: " + `${BASE_URL}/v1/public/sitemap.xml`
  ].join("\n");
}
