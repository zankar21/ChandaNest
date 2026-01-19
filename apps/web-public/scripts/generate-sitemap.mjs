#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_API = (process.env.VITE_API_BASE || process.env.API_BASE || "http://localhost:8080").replace(/\/+$/, "");
const isProdLike =
  process.env.CI === "true" ||
  process.env.NODE_ENV === "production" ||
  process.env.APP_ENV === "production";

const baseFromEnv =
  process.env.VITE_PUBLIC_WEB_BASE_URL ||
  process.env.PUBLIC_WEB_BASE_URL ||
  process.env.PUBLIC_WEB_BASE ||
  "";

const fallbackDevBase = process.env.VITE_DEV_BASE_URL || "http://localhost:5173";

function normalizeBase(base) {
  const trimmed = (base || "").trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;
  const isHttp = /^https?:\/\//i.test(trimmed);
  if (!isHttp) return "";
  return trimmed;
}

const normalizedEnvBase = normalizeBase(baseFromEnv);
const BASE_WEB = normalizeBase(normalizedEnvBase || (isProdLike ? "" : fallbackDevBase));

if (isProdLike && !normalizedEnvBase) {
  console.error(
    "Missing VITE_PUBLIC_WEB_BASE_URL (or PUBLIC_WEB_BASE_URL) in production/CI build. Example: https://www.chandanest.in"
  );
  process.exit(1);
}

if (!BASE_WEB) {
  console.error("Failed to resolve BASE_WEB for sitemap generation");
  process.exit(1);
}

if (!/^https?:\/\//i.test(BASE_WEB)) {
  console.error("BASE_WEB must start with http:// or https://");
  process.exit(1);
}

console.log(`[sitemap] base=${BASE_WEB} prodLike=${isProdLike}`);

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPropertyUrl(p) {
  const citySlug = slugify(p.location?.city || "city");
  const localitySlug = slugify(p.location?.locality || "locality");
  const typeSlug = slugify(p.listing?.type || "property");
  const area =
    p?.area?.builtUp ??
    p?.area?.plot ??
    p?.area?.carpet ??
    p?.area?.land ??
    null;
  const areaText = area ? `${area}-sqft` : "listing";
  const seoSlug = slugify(`${areaText}-${typeSlug}-in-${localitySlug}`);
  return `/property/${citySlug}/${localitySlug}/${seoSlug}`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const apiUrl = `${BASE_API}/v1/public/properties`;
  let items = [];
  try {
    const json = await fetchJson(apiUrl);
    items = Array.isArray(json.data?.items) ? json.data.items : Array.isArray(json.items) ? json.items : [];
  } catch (err) {
    if (isProdLike) throw err;
    console.warn("[sitemap] API fetch failed, generating static sitemap only.");
  }

  const urlSet = new Set();

  const cityLocality = new Set();
  items.forEach((p) => {
    const c = slugify(p.location?.city || "");
    const l = slugify(p.location?.locality || "");
    if (c) {
      urlSet.add(`/properties/${c}`);
      if (l) cityLocality.add(`${c}::${l}`);
    }
  });
  cityLocality.forEach((combo) => {
    const [c, l] = combo.split("::");
    urlSet.add(`/properties/${c}/${l}`);
  });

  items.forEach((p) => {
    const loc = buildPropertyUrl(p);
    urlSet.add(loc);
  });

  const urls = Array.from(urlSet).sort();

  const xmlEntries = urls.map((loc) => {
    let priority = "0.6";
    if (loc.split("/").length <= 3) priority = "0.8";
    else if (loc.split("/").length === 4) priority = "0.7";
    return `<url><loc>${BASE_WEB}${loc}</loc><changefreq>daily</changefreq><priority>${priority}</priority></url>`;
  });

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    xmlEntries.join("") +
    `</urlset>`;

  const robots = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /login",
    "Disallow: /preview",
    `Sitemap: ${BASE_WEB}/sitemap.xml`
  ].join("\n");

  const publicDir = path.join(__dirname, "..", "public");
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, "sitemap.xml"), xml, "utf8");
  await fs.writeFile(path.join(publicDir, "robots.txt"), robots, "utf8");
  console.log(`Sitemap written with ${urls.length} urls`);
}

main().catch((err) => {
  console.error("Failed to generate sitemap", err);
  process.exit(1);
});
