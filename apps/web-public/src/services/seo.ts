import { apiClient } from "./apiClient";

export type CitySeo = {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

export async function fetchCitySeo(citySlug: string) {
  return apiClient.get<{ title: string; description: string; canonical: string; ogTitle: string; ogDescription: string; ogImage: string }>(
    `/v1/public/seo/cities/${citySlug}`
  );
}
