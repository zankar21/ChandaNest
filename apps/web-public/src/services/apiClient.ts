import { OWNER_TENANT_ID } from "../constants/marketplace";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

type ApiIssue = { path: (string | number)[]; message: string };

type ApiError = Error & {
  code?: string;
  issues?: ApiIssue[];
  status?: number;
  data?: any;
  fields?: string[];
};

let currentIdToken: string | null = null;

export type NearbyCategoryKey =
  | "atm"
  | "grocery"
  | "pharmacy"
  | "school"
  | "hospital"
  | "college"
  | "railway"
  | "bus"
  | "market"
  | "police"
  | "restaurant"
  | "park";

export type NearbyPlace = {
  placeId: string;
  name: string;
  type?: string;
  address?: string | null;
  rating?: number | null;
  reviews?: number | null;
  source: "curated" | "places";
  location: { lat: number; lng: number };
  googleMapsUrl: string;
  distanceKm: number;
  drive?: { km: number; minutes: number | null; status: string };
  walk?: { km: number; minutes: number | null; status: string };
};

export type NearbyCategory = {
  key: NearbyCategoryKey;
  title: string;
  radiusMeters: number;
  items: NearbyPlace[];
};

export type NearbyResponse = {
  available: boolean;
  reason?: string;
  propertyId?: string;
  origin?: { lat: number; lng: number };
  categories?: NearbyCategory[];
};

export type DistanceMatrixDestination = {
  lat: number;
  lng: number;
  label?: string;
  type?: string;
};

export type DistanceMatrixResult = {
  label?: string;
  type?: string;
  km: number;
  minutes?: number | null;
  status: string;
};

export type PublicProject = {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  location?: { city?: string; area?: string; addressLine?: string; lat?: number; lng?: number };
  priceRange?: { min?: number; max?: number; currency?: "INR" };
  amenities?: string[];
  highlights?: string[];
  media?: {
    cover?: { objectPath: string };
    gallery?: { objectPath: string }[];
    brochure?: { objectPath: string };
  };
  visibility?: { state?: "draft" | "published"; publishedAt?: string };
  counts?: { totalUnits?: number; availableUnits?: number };
  updatedAt?: string;
};

export type PublicProjectUnit = {
  id: string;
  projectId: string;
  unitId: string;
  type: string;
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  availability?: string;
};

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) return "";
  const query = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
  return query ? `?${query}` : "";
}

export function setAuthToken(token: string | null) {
  currentIdToken = token;
}

function normalizeIssuePath(path: unknown) {
  if (Array.isArray(path)) return path;
  if (typeof path === "string" && path.length) return path.split(".");
  return [];
}

function parseIssues(payload: any): ApiIssue[] {
  const issues = payload?.error?.issues || payload?.error?.errors || payload?.error?.details?.issues;
  if (!Array.isArray(issues)) return [];
  return issues
    .map((issue: any) => ({
      path: normalizeIssuePath(issue?.path),
      message: typeof issue?.message === "string" ? issue.message : "Validation error"
    }))
    .filter((issue: ApiIssue) => issue.message);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(currentIdToken ? { Authorization: `Bearer ${currentIdToken}` } : {}),
      ...(options.headers || {})
    }
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    const message = json?.error?.message || res.statusText;
    const err = new Error(message) as ApiError;
    err.code = json?.error?.code;
    err.issues = parseIssues(json);
    err.status = res.status;
    err.data = json;
    err.fields = Array.isArray(json?.error?.fields) ? json.error.fields : undefined;
    throw err;
  }
  return json?.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined })
};

export function getOwnerTenantId() {
  return OWNER_TENANT_ID;
}

export async function getPublicProperties(): Promise<any[]> {
  const data = await apiClient.get<{ items: any[] }>("/v1/public/properties");
  return data.items || [];
}

export async function getPublicProperty(propertyId: string): Promise<any> {
  return apiClient.get<any>(`/v1/public/properties/${propertyId}`);
}

export async function publicListProjects(params?: {
  city?: string;
  q?: string;
  type?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ items: PublicProject[]; nextCursor?: string }> {
  return apiClient.get<{ items: PublicProject[]; nextCursor?: string }>(
    `/v1/public/projects${buildQuery(params || {})}`
  );
}

export async function publicGetProject(slug: string): Promise<PublicProject> {
  return apiClient.get<PublicProject>(`/v1/public/projects/${slug}`);
}

export async function publicListProjectUnits(slug: string): Promise<{ items: PublicProjectUnit[] }> {
  return apiClient.get<{ items: PublicProjectUnit[] }>(`/v1/public/projects/${slug}/units`);
}

export async function createPublicLead(input: {
  tenantId?: string;
  subject: {
    kind: "property" | "project" | "general";
    propertyId?: string;
    projectId?: string;
    projectSlug?: string;
    title?: string;
    href?: string;
    city?: string;
    area?: string;
  };
  contact: {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
  };
  source?: {
    page?: "property" | "project" | "home" | "map" | "search";
    utm?: { source?: string; medium?: string; campaign?: string };
  };
}) {
  try {
    const res = await fetch(`${API_BASE}/v1/public/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (res.status === 204) {
      return { leadId: "ignored" };
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.ok === false) {
      const message = json?.error?.message || res.statusText;
      const err = new Error(message) as ApiError;
      err.code = json?.error?.code;
      err.issues = parseIssues(json);
      err.status = res.status;
      err.data = json;
      err.fields = Array.isArray(json?.error?.fields) ? json.error.fields : undefined;
      throw err;
    }
    return json?.data as { leadId: string };
  } catch (err) {
    throw err;
  }
}

export async function getPublicNearby(propertyId: string): Promise<NearbyResponse> {
  return apiClient.get<NearbyResponse>(`/v1/public/properties/${propertyId}/nearby`);
}

export async function getNearbyTravelTime(
  origin: { lat: number; lng: number },
  destinations: DistanceMatrixDestination[],
  mode: "driving" | "walking" = "driving"
): Promise<DistanceMatrixResult[]> {
  return apiClient.post<DistanceMatrixResult[]>(`/v1/public/nearby/distance-matrix`, {
    origin,
    destinations,
    mode
  });
}

export async function signGetPublic(paths: string[]): Promise<Record<string, string>> {
  if (!paths || paths.length === 0) return {};
  const data = await apiClient.post<{ items: { objectPath: string; url: string }[] }>(
    "/v1/public/media/sign-get",
    { paths }
  );
  const map: Record<string, string> = {};
  (data.items || []).forEach((item) => {
    map[item.objectPath] = item.url;
  });
  return map;
}

export async function fetchMetaEnums() {
  return apiClient.get<{
    listingMode: string[];
    listingDealType: string[];
    propertyType: string[];
    projectType: string[];
    projectStatus: string[];
    unitType: string[];
    naStatus: string[];
    layoutApprovalStatus: string[];
    availability: string[];
  }>("/v1/meta/enums");
}

export async function fetchListingConfig(tenantId: string) {
  return apiClient.get<{
    tenantId?: string | null;
    listingTypes: string[];
    propertyTypes: string[];
    landTypes?: string[];
    listingTypePropertyTypes?: Record<string, string[]>;
    subTypes?: Record<string, string[]>;
    areaUnits?: Record<string, string[]>;
    required?: {
      publish?: {
        descriptionMin?: number;
        mediaGalleryMin?: number;
        saleTotalPrice?: boolean;
        rentMonthlyRent?: boolean;
        landRecord?: string[];
      };
    };
  }>(`/v1/meta/listing-config?tenantId=${encodeURIComponent(tenantId)}`);
}

export async function getTenantMe(tenantId: string) {
  return apiClient.get<{
    kycStatus?: string;
    role?: string;
    tenantId?: string;
    phoneNumber?: string;
    email?: string;
    fullName?: string;
    ownerType?: string;
    city?: string;
    contactPreference?: string;
    bestTimeToContact?: string;
    alternatePhone?: string;
    onboardedAt?: string;
  }>(
    `/v1/tenants/${tenantId}/me`
  );
}

export async function ownerOnboard(
  tenantId: string,
  body?: {
    fullName: string;
    ownerType: "individual" | "company" | "family_joint";
    city: string;
    contactPreference: "call" | "whatsapp";
    bestTimeToContact: "morning" | "afternoon" | "evening";
    alternatePhone?: string;
    email?: string;
    consentOwner: true;
    consentTerms: true;
    consentContact: true;
  }
) {
  return apiClient.post<{ ok: boolean }>(`/v1/tenants/${tenantId}/owner/onboard`, body || {});
}

export async function listMyListings(tenantId: string) {
  return apiClient.get<{ items: any[] }>(`/v1/tenants/${tenantId}/listings?mine=1`);
}

export async function getOwnerListing(tenantId: string, listingId: string) {
  return apiClient.get<any>(`/v1/tenants/${tenantId}/listings/${listingId}`);
}

export async function validateOwnerListing(tenantId: string, listingId: string) {
  return apiClient.get<{ canSubmit: boolean; canPublish: boolean; missing: string[] }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/validate`
  );
}

export async function createOwnerListing(tenantId: string, body: any) {
  return apiClient.post<{ listingId: string }>(`/v1/tenants/${tenantId}/listings`, body);
}

export async function patchOwnerListing(tenantId: string, listingId: string, body: any) {
  return request(`/v1/tenants/${tenantId}/listings/${listingId}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function submitOwnerListing(tenantId: string, listingId: string) {
  return apiClient.post(`/v1/tenants/${tenantId}/listings/${listingId}/submit`, {});
}

export async function publishOwnerListing(tenantId: string, listingId: string) {
  return apiClient.post(`/v1/tenants/${tenantId}/listings/${listingId}/publish`, {});
}

export async function unpublishOwnerListing(tenantId: string, listingId: string) {
  return apiClient.post(`/v1/tenants/${tenantId}/listings/${listingId}/unpublish`, {});
}

export async function deleteOwnerListing(tenantId: string, listingId: string) {
  return request(`/v1/tenants/${tenantId}/listings/${listingId}`, {
    method: "DELETE"
  });
}

export async function signPutMedia(objectPath: string, contentType: string) {
  return apiClient.post<{ url: string; objectPath: string; expiresAt: string }>(`/v1/media/sign-put`, {
    objectPath,
    contentType
  });
}

export async function signGetMedia(paths: string[]) {
  if (!paths || paths.length === 0) return {};
  const data = await apiClient.post<{ items: { objectPath: string; url: string }[] }>(`/v1/media/sign-get`, {
    paths
  });
  const map: Record<string, string> = {};
  (data.items || []).forEach((item) => {
    map[item.objectPath] = item.url;
  });
  return map;
}
