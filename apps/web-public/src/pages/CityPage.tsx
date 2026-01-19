import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { isTargetCitySlug, TARGET_CITIES } from "../constants/market";
import PropertyListPage from "./PropertyList/PropertyListPage";
import { fetchCitySeo } from "../services/seo";

export default function CityPage() {
  const { citySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seoError, setSeoError] = useState<string | null>(null);

  const validSlug = useMemo(() => (citySlug && isTargetCitySlug(citySlug) ? citySlug : null), [citySlug]);

  useEffect(() => {
    if (validSlug) {
      const sp = new URLSearchParams(searchParams);
      if (sp.get("city") !== validSlug) {
        sp.set("city", validSlug);
        setSearchParams(sp, { replace: true });
      }
    }
  }, [validSlug, searchParams, setSearchParams]);

  useEffect(() => {
    async function loadSeo(slug: string) {
      try {
        const data = await fetchCitySeo(slug);
        setSeoMeta(data);
        setSeoError(null);
      } catch (err: any) {
        setSeoError(err.message || "Failed to load SEO");
      }
    }
    if (validSlug) {
      loadSeo(validSlug);
    }
  }, [validSlug]);

  if (!validSlug) return <div className="text-sm text-secondary">City not found.</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm uppercase text-indigo-600 font-semibold">City</div>
          <h1 className="text-2xl font-bold text-primary">{TARGET_CITIES[validSlug].name}</h1>
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {seoError ? "SEO unavailable" : "SEO loaded"}
        </div>
      </div>
      <PropertyListPage initialCitySlug={validSlug} />
    </div>
  );
}

function setSeoMeta(data: {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}) {
  if (data.title) document.title = data.title;
  const setMeta = (name: string, content: string) => {
    if (!content) return;
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", name);
      document.head.appendChild(tag);
    }
    tag.content = content;
  };
  setMeta("description", data.description);
  setMeta("og:title", data.ogTitle);
  setMeta("og:description", data.ogDescription);
  setMeta("og:image", data.ogImage);
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = data.canonical;
}



