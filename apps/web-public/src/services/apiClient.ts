import { getAuth } from "firebase/auth";
import { OWNER_TENANT_ID } from "../constants/marketplace";
import { assertNoLegacyKeys, type PropertyListingV3 } from "../modules/listings/truth";
import { authReady } from "./firebase";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const ENV_TENANT_ID = import.meta.env.VITE_TENANT_ID;
const TENANT_STORAGE_KEY = "cn_tenant_id";
const CITY_STORAGE_KEY = "cn_city_name";
const TOKEN_STORAGE_KEY = "cn_id_token";

type ApiIssue = { path: (string | number)[]; message: string };

type ApiError = Error & {
  code?: string;
  issues?: ApiIssue[];
  status?: number;
  data?: any;
  fields?: string[];
};

export type AgentMe = {
  isAgent: boolean;
  status?: "ACTIVE" | "PENDING" | "REJECTED" | "NONE" | null;
  planCode?: string | null;
  subscriptionStatus?: string | null;
  isActive?: boolean;
  currentPeriodEnd?: string | null;
  lastEvent?: string | null;
  lastEventAt?: string | null;
  publishLimit?: number | null;
  publishRemaining?: number | null;
  agent?: {
    uid: string;
    tenantId: string;
    status?: string | null;
    phone?: string | null;
    plan?: "independent" | "professional" | "promax" | null;
    fullName?: string | null;
    businessName?: string | null;
    city?: string | null;
    reraId?: string | null;
  } | null;
  plan?: "independent" | "professional" | "promax" | null;
  trialStartAt?: string | null;
  trialEndAt?: string | null;
  trialDaysLeft?: number;
  limits?: {
    maxPublishedListings: number | null;
    dailyPublishLimit: number | null;
    leadRevealLimit: number | null;
  };
  canPublish?: boolean;
  canReceiveLeads?: boolean;
  isTrial?: boolean;
  agentEnforcementEnabled?: boolean;
  monetization?: {
    source?: "listing_entitlement" | "monthly_compat" | "none";
    publishEligible?: boolean;
    monthlyQuota?: number | null;
    monthlyRemaining?: number | null;
  } | null;
  user?: {
    uid: string;
    displayName?: string | null;
    phone?: string | null;
    role?: string | null;
    tenantId?: string | null;
  };
  brokerProfile?: any;
};

export type MonetizationCatalogProduct = {
  productId: string;
  version: number;
  isActive: boolean;
  productType:
    | "listing_access"
    | "boost"
    | "spotlight"
    | "subscription"
    | "agent_listing_credit_pack"
    | "recurring_feature_visibility";
  billingType: "one_time" | "recurring";
  appliesToRole: "owner" | "agent" | "builder" | "enterprise";
  entitlementScope: "user" | "listing" | "project" | "unit" | "tenant" | "wallet";
  price: {
    amount: number;
    currency: "INR";
  };
  durationDays?: number;
  billingCycle?: "weekly" | "monthly" | "yearly";
  limits?: Record<string, any>;
  features?: Record<string, any>;
};

let currentIdToken: string | null =
  typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;

function getTenantId(): string | undefined {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(TENANT_STORAGE_KEY);
    if (stored) return stored;
  }
  if (ENV_TENANT_ID) return ENV_TENANT_ID;
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "powerpulsetech";
  }
  return undefined;
}

export type CityContext = {
  citySlug: string;
  city: string;
  state: string;
  district: string;
  talukas: string[];
  tenantId: string;
};

export function setTenantId(tenantId: string | null) {
  if (typeof window === "undefined") return;
  if (tenantId && tenantId.trim()) {
    window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId.trim());
  } else {
    window.localStorage.removeItem(TENANT_STORAGE_KEY);
  }
}

export function getStoredCityName() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CITY_STORAGE_KEY) || "";
}

export function setStoredCityName(city: string | null) {
  if (typeof window === "undefined") return;
  if (city && city.trim()) {
    window.localStorage.setItem(CITY_STORAGE_KEY, city.trim());
  } else {
    window.localStorage.removeItem(CITY_STORAGE_KEY);
  }
}

export async function fetchCityContext(params: { city?: string; citySlug?: string }) {
  const query = buildQuery({
    city: params.city || undefined,
    citySlug: params.citySlug || undefined
  });
  return apiClient.get<CityContext>(`/v1/meta/city-context${query}`);
}

export async function fetchMarketCities() {
  const data = await apiClient.get<{ items: CityContext[] }>("/v1/meta/cities");
  return data.items || [];
}

export async function syncTenantForCity(city: string) {
  try {
    const context = await fetchCityContext({ city });
    const tenantId = context.tenantId || getTenantId() || OWNER_TENANT_ID;
    setTenantId(tenantId);
    setStoredCityName(context.city || city);
    return tenantId;
  } catch {
    const tenantId = getTenantId() || OWNER_TENANT_ID;
    setTenantId(tenantId);
    setStoredCityName(city);
    return tenantId;
  }
}

export async function syncTenantForCitySlug(citySlug: string) {
  try {
    const context = await fetchCityContext({ citySlug });
    const tenantId = context.tenantId || getTenantId() || OWNER_TENANT_ID;
    setTenantId(tenantId);
    setStoredCityName(context.city || citySlug);
    return tenantId;
  } catch {
    const tenantId = getTenantId() || OWNER_TENANT_ID;
    setTenantId(tenantId);
    setStoredCityName(citySlug);
    return tenantId;
  }
}

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
  projectId?: string;
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
  category?: "residential" | "plotted" | "commercial" | "mixed";
  status: string;
  lifecycleStatus?: string;
  recordStatus?: "active" | "inactive";
  tenantId?: string;
  location?: {
    city?: string;
    area?: string;
    addressLine?: string;
    landmark?: string;
    district?: string;
    state?: string;
    pincode?: string;
    lat?: number;
    lng?: number;
  };
  inventory?: {
    totalUnitsPlanned?: number;
    totalUnits?: number;
    availableUnits?: number;
    towers?: number;
    floors?: number;
    parking?: string;
  };
  city?: string;
  citySlug?: string;
  area?: string | null;
  priceRange?: { min?: number; max?: number; currency?: "INR" };
  minPrice?: number | null;
  maxPrice?: number | null;
  startingPrice?: number | null;
  availableUnits?: number | null;
  totalUnits?: number | null;
  bhkTypes?: number[];
  coverObjectPath?: string | null;
  coverUrl?: string | null;
  updatedAtMs?: number | null;
  amenities?: string[];
  highlights?: string[];
  plotDetails?: {
    totalLandArea?: number;
    totalLandAreaUnit?: "sq_m" | "acre" | "hectare";
    plotCount?: number;
    approvals?: {
      layoutApproved?: boolean;
      naApproved?: boolean;
      tpApproved?: boolean;
    };
    plotInventories?: {
      sizeSqFt?: number;
      sizeValue?: number;
      sizeUnit?: "sq_ft" | "sq_m" | "acre" | "hectare";
      count: number;
      frontageFt?: number;
      depthFt?: number;
    }[];
    roadWidthM?: number;
    waterConnection?: boolean;
    electricityConnection?: boolean;
    drainageConnection?: boolean;
    gatedCommunity?: boolean;
    internalRoadType?: "cc" | "asphalt" | "wbm";
    waterSource?: "borewell" | "municipal" | "both";
    sewageSystem?: "septic" | "underground_drainage";
    bankLoanApproved?: boolean;
    approvedBanks?: string[];
    possessionTimeline?: "ready" | "6_months" | "12_months" | "18_months" | "2_years" | "3_years";
    possessionTimelineNote?: string;
  };
  commercialDetails?: {
    typicalUnitSizeMinSqFt?: number;
    typicalUnitSizeMaxSqFt?: number;
    parkingNotes?: string;
  };
  mixedIncludes?: { residential?: boolean; commercial?: boolean; plotted?: boolean };
  rera?: { number?: string; authority?: string };
  approvals?: { layoutApproved?: boolean; naApproved?: boolean };
  developerName?: string;
  completionDate?: string;
  possessionDate?: string;
  possessionStatus?: string;
  configurationMix?: { bhk1?: number; bhk2?: number; bhk3?: number; bhk4?: number };
  media?: {
    cover?: { objectPath: string };
    gallery?: { objectPath: string }[];
    brochure?: { objectPath: string };
  };
  visibility?: { state?: "draft" | "published"; publishedAt?: string };
  counts?: { totalUnits?: number; availableUnits?: number };
  updatedAt?: string;
};

export type PublicPropertyListing = {
  id: string;
  listingId?: string;
  title?: string;
  dealIntent?: "sale" | "rent" | "lease" | "joint_venture";
  publishState?: "draft" | "published" | "unpublished";
  propertyType?: string;
  category?: string;
  location?: {
    city?: string;
    citySlug?: string;
    locality?: string;
    state?: string;
    addressLine?: string;
    landmark?: string;
    pincode?: string;
    geo?: { lat?: number; lng?: number };
  };
  area?: { value?: number; unit?: string };
  saleDetails?: {
    totalPrice?: number;
    ratePerSqFt?: number;
    priceOnRequest?: boolean;
    maintenanceMonthly?: number;
    negotiable?: boolean;
    allInclusivePrice?: boolean;
  };
  rentalDetails?: any;
  specs?: any;
  plotInfo?: any;
  landRecord?: any;
  media?: any;
  mediaItems?: any[];
  contact?: any;
  expiresAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export type PublicProjectUnit = {
  id: string;
  projectId: string;
  unitId: string;
  unitNumber?: string;
  configurationLabel?: string;
  tower?: string;
  projectSlug?: string;
  city?: string;
  citySlug?: string;
  bhk?: number | null;
  type: string;
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  plotLengthFeet?: number;
  plotWidthFeet?: number;
  plotAreaSqFt?: number;
  saleableSqFt?: number;
  roadWidthFeet?: number;
  corner?: boolean;
  cornerPremiumPct?: number;
  finalPrice?: number;
  availability?: string;
  area?: { areaSqFt?: number; carpetSqFt?: number; builtUpSqFt?: number; superBuiltUpSqFt?: number };
  pricing?: { basePrice?: number; allInclusivePrice?: number; pricePerSqFt?: number; bookingAmount?: number; maintenanceMonthly?: number; currency?: "INR" };
  floorInfo?: { number?: number; totalFloors?: number };
  media?: { floorPlan?: { objectPath: string } };
  priceNumber?: number | null;
  areaSqFtNumber?: number | null;
  updatedAtMs?: number | null;
  floorsType?: string;
  cornerUnit?: boolean;
  tenancyType?: string;
  fitoutStatus?: string;
  possession?: string;
  frontageFeet?: number;
  ceilingHeightFeet?: number;
};

export type UnifiedResultItem = {
  resultType: "property" | "project_unit";
  id: string;
  propertyId?: string;
  title: string;
  dealIntent?: "sale" | "rent" | "lease" | "joint_venture";
  propertyType?: string;
  citySlug?: string;
  locality?: string;
  priceLabel?: string | null;
  priceValue?: number | null;
  priceOnRequest?: boolean;
  areaLabel?: string | null;
  areaValue?: number | null;
  areaUnit?: string | null;
  bhk?: number | null;
  facing?: string | null;
  heroObjectPath?: string | null;
  badges?: string[];
  updatedAt?: string | null;
  projectId?: string;
  projectSlug?: string;
  projectName?: string;
  unitId?: string;
  unitNumber?: string;
  availability?: "available" | "blocked" | "sold";
  tower?: string | null;
  floor?: number | null;
};

export type PublicSearchInterpretation = {
  rawQuery: string;
  normalizedQuery: string;
  residualText: string;
  aiUsed: false;
  parserVersion: "rules_v1";
  filters: {
    city?: string | null;
    citySlug?: string | null;
    bhk?: number | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    type?: "sale" | "rent" | "lease" | null;
    propertyType?: string | null;
  };
  nearbyHints: string[];
  lifestyleHints: string[];
  chips: Array<{
    kind: "city" | "budget" | "bhk" | "intent" | "property_type" | "nearby" | "lifestyle";
    label: string;
    applied: boolean;
  }>;
  explanation: string[];
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
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
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

async function handleResponse<T>(res: Response): Promise<T> {
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

async function getFreshIdToken(): Promise<string | null> {
  await authReady.catch(() => null);
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return currentIdToken;
  try {
    const token = await user.getIdToken();
    if (token) currentIdToken = token;
    return token;
  } catch {
    try {
      const token = await user.getIdToken(true);
      if (token) currentIdToken = token;
      return token;
    } catch {
      return currentIdToken;
    }
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const tenantId = getTenantId();
  if (!tenantId && import.meta.env.PROD) {
    throw new Error("Tenant not selected. Please choose city/tenant or re-login.");
  }
  const needsAuth =
    path.startsWith("/v1/agent") ||
    path.startsWith("/v1/tenants") ||
    path.startsWith("/v1/media") ||
    path.startsWith("/v1/monetization");
  const idToken = needsAuth ? await getFreshIdToken() : null;
  if (needsAuth && !idToken) {
    const err: ApiError = new Error("Missing bearer token");
    err.status = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }
  const buildHeaders = (bearer?: string | null) => ({
    "Content-Type": "application/json",
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    ...(options.headers || {})
  });

  const makeRequest = (bearer?: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...options,
      headers: buildHeaders(bearer)
    });

  let res = await makeRequest(idToken);
  if (needsAuth && (res.status === 401 || res.status === 403)) {
    const fresh = await getAuth().currentUser?.getIdToken(true).catch(() => null);
    if (fresh) {
      res = await makeRequest(fresh);
      return handleResponse<T>(res);
    }
  }
  return handleResponse<T>(res);
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined })
};

export function getOwnerTenantId() {
  return getTenantId() || OWNER_TENANT_ID;
}

export async function getPublicProperties(params?: { citySlug?: string; limit?: number }): Promise<any[]> {
  const data = await apiClient.get<{ items: any[] }>(`/v1/public/properties${buildQuery(params || {})}`);
  return data.items || [];
}

export async function getPublicProperty(propertyId: string): Promise<any> {
  return apiClient.get<any>(`/v1/public/properties/${propertyId}`);
}

export async function getPublicSimilarProperties(
  propertyId: string,
  params?: { citySlug?: string; category?: string; dealIntent?: string; locality?: string; limit?: number }
): Promise<any[]> {
  const items = await getPublicProperties({
    citySlug: params?.citySlug,
    limit: Math.max((params?.limit || 6) * 4, 18)
  });
  const normalizedLocality = String(params?.locality || "").trim().toLowerCase();
  const normalizedCategory = String(params?.category || "").trim().toLowerCase();
  const normalizedIntent = String(params?.dealIntent || "").trim().toLowerCase();

  return items
    .filter((item) => item?.id !== propertyId)
    .filter((item) => !normalizedCategory || String(item?.category || "").trim().toLowerCase() === normalizedCategory)
    .filter((item) => !normalizedIntent || String(item?.dealIntent || "").trim().toLowerCase() === normalizedIntent)
    .sort((a, b) => {
      const aLocality = String(a?.location?.locality || "").trim().toLowerCase();
      const bLocality = String(b?.location?.locality || "").trim().toLowerCase();
      const aLocalityMatch = normalizedLocality && aLocality === normalizedLocality ? 1 : 0;
      const bLocalityMatch = normalizedLocality && bLocality === normalizedLocality ? 1 : 0;
      if (aLocalityMatch !== bLocalityMatch) return bLocalityMatch - aLocalityMatch;

      const aUpdated = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
      const bUpdated = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
      if (aUpdated !== bUpdated) return bUpdated - aUpdated;

      const aMediaCount = Array.isArray(a?.mediaItems)
        ? a.mediaItems.length
        : Array.isArray(a?.media?.gallery)
          ? a.media.gallery.length + (a?.media?.hero ? 1 : 0)
          : 0;
      const bMediaCount = Array.isArray(b?.mediaItems)
        ? b.mediaItems.length
        : Array.isArray(b?.media?.gallery)
          ? b.media.gallery.length + (b?.media?.hero ? 1 : 0)
          : 0;
      return bMediaCount - aMediaCount;
    })
    .slice(0, params?.limit || 6);
}

export async function publicListProjects(params?: {
  city?: string;
  q?: string;
  type?: string;
  status?: string;
  lifecycleStatus?: string;
  recordStatus?: string;
  minPrice?: string;
  maxPrice?: string;
  bhk?: string;
  sort?: string;
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

export async function publicListProjectUnits(
  slug: string,
  params?: { availability?: string; bhk?: string; minPrice?: string; maxPrice?: string; sort?: string }
): Promise<{ items: PublicProjectUnit[] }> {
  return apiClient.get<{ items: PublicProjectUnit[] }>(
    `/v1/public/projects/${slug}/units${buildQuery(params || {})}`
  );
}

export async function publicGetProjectNearby(slug: string): Promise<NearbyResponse> {
  return apiClient.get<NearbyResponse>(`/v1/public/projects/${slug}/nearby`);
}

export async function publicSearch(params: {
  query: string;
  city?: string;
  budget?: string;
  intent?: string;
}): Promise<{ items: any[]; interpretedQuery?: PublicSearchInterpretation | null }> {
  return apiClient.get<{ items: any[]; interpretedQuery?: PublicSearchInterpretation | null }>(
    `/v1/public/search${buildQuery(params)}`
  );
}

export async function publicUnifiedSearch(params: {
  citySlug?: string;
  dealIntent?: string;
  propertyType?: string;
  bhk?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  q?: string;
  resultType?: "all" | "property" | "project_unit";
  availability?: "available" | "blocked" | "sold";
  limit?: number;
}): Promise<{ items: UnifiedResultItem[]; nextCursor?: string; interpretedQuery?: PublicSearchInterpretation | null }> {
  return apiClient.get<{ items: UnifiedResultItem[]; nextCursor?: string; interpretedQuery?: PublicSearchInterpretation | null }>(
    `/v1/public/search${buildQuery(params || {})}`
  );
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
    const tenantId = getTenantId();
    if (!tenantId && import.meta.env.PROD) {
      throw new Error("Tenant not selected. Please choose city/tenant or re-login.");
    }
    const res = await fetch(`${API_BASE}/v1/public/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tenantId ? { "x-tenant-id": tenantId } : {})
      },
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

export async function createPublicBusinessRequest(input: {
  businessType: "agency" | "enterprise" | "builder";
  organizationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  serviceAreas?: string[];
  yearsInBusiness?: number;
  reraId?: string;
  gstNumber?: string;
  website?: string;
  expectedListings?: number;
  preferredContact?: "call" | "whatsapp" | "email";
  bestTimeToContact?: "morning" | "afternoon" | "evening";
  interestedPlan: "trial" | "starter" | "growth" | "premium";
  message?: string;
}) {
  const tenantId = getTenantId();
  if (!tenantId && import.meta.env.PROD) {
    throw new Error("Tenant not selected. Please choose city/tenant or re-login.");
  }
  const res = await fetch(`${API_BASE}/v1/public/business-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tenantId ? { "x-tenant-id": tenantId } : {})
    },
    body: JSON.stringify(input)
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
  const requestId = json?.data?.requestId ?? json?.requestId;
  if (!requestId) {
    throw new Error("Business request submitted, but no ID was returned.");
  }
  return { requestId };
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

export async function getAgentMe() {
  try {
    const raw = await apiClient.get<any>("/v1/agent/me");
    const data = raw?.data ?? raw ?? {};
    return {
      isAgent: Boolean(data?.isAgent),
      status: data?.status ?? null,
      agent: data?.agent ?? null,
      planCode: data?.planCode ?? null,
      subscriptionStatus: data?.subscriptionStatus ?? null,
      isActive: Boolean(data?.isActive),
      currentPeriodEnd: data?.currentPeriodEnd ?? null,
      lastEvent: data?.lastEvent ?? null,
      lastEventAt: data?.lastEventAt ?? null,
      publishLimit: typeof data?.publishLimit === "number" ? data.publishLimit : null,
      publishRemaining: typeof data?.publishRemaining === "number" ? data.publishRemaining : null,
      canPublish: Boolean(data?.canPublish),
      isTrial: Boolean(data?.isTrial),
      agentEnforcementEnabled: Boolean(data?.agentEnforcementEnabled),
      monetization: data?.monetization ?? null
    } as AgentMe;
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 403) {
      return { isAgent: false } as AgentMe;
    }
    throw err;
  }
}

export async function makeDevAgent(body?: { tenantId?: string; displayName?: string }) {
  return apiClient.post<{ ok: boolean; isAgent: boolean; tenantId?: string }>("/v1/dev/make-agent", body || {});
}

export async function submitAgentOnboarding(body: {
  plan: "independent" | "professional" | "promax";
  fullName: string;
  businessName: string;
  city: string;
  reraId?: string;
}) {
  const raw = await request<any>("/v1/agent/onboarding/submit", {
    method: "POST",
    body: JSON.stringify(body)
  });
  const data = raw?.data ?? raw ?? {};
  return {
    submitted: Boolean(data?.submitted),
    status: data?.status ?? null,
    isAgent: Boolean(data?.isAgent)
  };
}

export async function startAgentSubscription(body: { planCode: "independent" | "professional" | "promax" }) {
  return apiClient.post<{ subscriptionId: string; keyId: string; planCode: string }>(
    "/v1/agent/subscription/start",
    body
  );
}

export async function verifyAgentSubscription(body: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) {
  return apiClient.post<{ status: string; isActive: boolean }>("/v1/agent/subscription/verify", body);
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

export async function getOwnerMonetizationUsageSummary() {
  return apiClient.get<{
    ownerEnforcementEnabled: boolean;
    activeCount: number;
    activeCap: number;
    remaining: number;
    capReached: boolean;
    listings: Array<{
      listingId: string;
      publishState: string;
      recordStatus: string;
      expiresAt: string | null;
      freeConsumed: boolean;
      entitlementExpiresAt: string | null;
      effectiveBoostTier: "none" | "boost" | "premium";
      boostExpiresAt: string | null;
      rankWeight?: number;
      activeCounted: boolean;
    }>;
  }>("/v1/monetization/owner/usage-summary");
}

export async function getMonetizationCatalog(input?: {
  role?: "owner" | "agent" | "builder" | "enterprise";
  includeInactive?: boolean;
}) {
  const query = buildQuery({
    role: input?.role,
    includeInactive: input?.includeInactive
  });
  return apiClient.get<{
    flags: {
      monetizationCatalogEnabled: boolean;
    };
    items: MonetizationCatalogProduct[];
  }>(`/v1/monetization/catalog${query}`);
}

export async function createOwnerBoostOrder(input: {
  listingId: string;
  tier: "boost" | "premium";
  idempotencyKey?: string;
}) {
  return apiClient.post<{
    skipped: boolean;
    reason?: string;
    effectiveBoostTier?: "none" | "boost" | "premium";
    boostExpiresAt?: string | null;
    orderId?: string;
    amount?: number;
    currency?: "INR";
    paymentProvider?: "manual" | "razorpay";
    providerOrderId?: string | null;
    keyId?: string | null;
  }>(`/v1/monetization/owner/listings/${input.listingId}/boost/order`, {
    tier: input.tier,
    idempotencyKey: input.idempotencyKey
  });
}

export async function listAgentListings() {
  return apiClient.get<{ items: any[] }>("/v1/agent/listings?mine=1");
}

export async function createAgentListingSkuOrder(input: {
  listingId: string;
  productId:
    | "agent_listing_basic_30d_v1"
    | "agent_listing_premium_45d_v1"
    | "agent_listing_featured_60d_v1";
  idempotencyKey?: string;
}) {
  return apiClient.post<{
    skipped?: boolean;
    reason?: string;
    effective?: { tier?: string; endsAt?: string | null };
    order?: {
      orderId: string;
      amount: number;
      currency: "INR";
      paymentProvider: "manual" | "razorpay";
      providerOrderId?: string | null;
      keyId?: string | null;
    };
    currentEffective?: {
      listingId: string;
      effectiveTier: string;
      effectiveProductId: string | null;
      effectiveEndsAt: string | null;
    };
  }>(`/v1/monetization/agent/listings/${input.listingId}/purchase/order`, {
    productId: input.productId,
    idempotencyKey: input.idempotencyKey
  });
}

export async function verifyMonetizationPayment(body: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiClient.post("/v1/monetization/payments/verify", body);
}

export async function getAgentMonetizationUsageSummary() {
  return apiClient.get<{
    agentEnforcementEnabled: boolean;
    monetizationSource: "listing_entitlement" | "monthly_compat" | "credit_wallet" | "none";
    activeListingCount: number;
    monthlyQuota: number | null;
    monthlyRemaining: number | null;
    monthlyActiveCount: number;
    monthlyCompatProductId: string | null;
    publishEligible: boolean;
    credits?: {
      totalCredits: number;
      remainingCredits: number;
      expiresAt: string | null;
      isExpired: boolean;
    };
    listings: Array<{
      listingId: string;
      publishState: string;
      recordStatus: string;
      activeCounted: boolean;
      entitlement: {
        tier: string;
        productId: string | null;
        endsAt: string | null;
      };
      autoRenew?: {
        available?: boolean;
        enabled: boolean;
        status: string;
        featuredActive: boolean;
        featuredEndsAt: string | null;
        nextChargeAt: string | null;
        lastPaymentStatus: string | null;
      };
      publishEligibilitySource: string;
    }>;
  }>("/v1/monetization/agent/usage-summary");
}

export async function startAgentFeaturedAutoRenew(input: {
  listingId: string;
  idempotencyKey?: string;
}) {
  return apiClient.post<{
    alreadyActive: boolean;
    subscriptionId?: string;
    providerPlanId?: string;
    keyId?: string;
    state: {
      autoRenewEnabled: boolean;
      status: string;
      featuredEndsAt: string | null;
      nextChargeAt: string | null;
      lastPaymentStatus: string | null;
      providerSubscriptionId: string | null;
      active: boolean;
    };
  }>(`/v1/monetization/agent/listings/${input.listingId}/featured-autorenew/start`, {
    autoRenewEnabled: true,
    idempotencyKey: input.idempotencyKey
  });
}

export async function cancelAgentFeaturedAutoRenew(input: { listingId: string }) {
  return apiClient.post<{
    canceled: boolean;
    reason?: string;
    state: {
      autoRenewEnabled: boolean;
      status: string;
      featuredEndsAt: string | null;
      nextChargeAt: string | null;
      lastPaymentStatus: string | null;
      providerSubscriptionId: string | null;
      active: boolean;
    };
  }>(`/v1/monetization/agent/listings/${input.listingId}/featured-autorenew/cancel`, {});
}

export async function getAgentFeaturedAutoRenewState(input: { listingId: string }) {
  return apiClient.get<{
    autoRenewEnabled: boolean;
    status: string;
    featuredEndsAt: string | null;
    nextChargeAt: string | null;
    lastPaymentStatus: string | null;
    providerSubscriptionId: string | null;
    active: boolean;
  }>(`/v1/monetization/agent/listings/${input.listingId}/featured-autorenew`);
}

export async function createAgentCreditPackOrder(input: {
  productId:
    | "agent_credit_pack_10_v1"
    | "agent_credit_pack_40_v1"
    | "agent_credit_pack_120_v1";
  idempotencyKey?: string;
}) {
  return apiClient.post<{
    order: {
      orderId: string;
      amount: number;
      currency: "INR";
      paymentProvider: "manual" | "razorpay";
      providerOrderId?: string | null;
      keyId?: string | null;
    };
    balance: {
      totalCredits: number;
      remainingCredits: number;
      expiresAt: string | null;
      isExpired: boolean;
    };
  }>("/v1/monetization/agent/credits/order", {
    productId: input.productId,
    idempotencyKey: input.idempotencyKey
  });
}

export async function getAgentCreditBalance() {
  return apiClient.get<{
    totalCredits: number;
    remainingCredits: number;
    expiresAt: string | null;
    isExpired: boolean;
  }>("/v1/monetization/agent/credits/balance");
}

export async function getAgentInvoices(limit = 20) {
  return apiClient.get<{ items: any[] }>(`/v1/agent/billing/invoices?limit=${limit}`);
}

export async function downloadAgentInvoice(invoiceId: string) {
  if (typeof window === "undefined") return;
  const tenantId = getTenantId();
  const token = await getFreshIdToken();
  if (!token) {
    throw new Error("Missing bearer token");
  }
  const res = await fetch(
    `${API_BASE}/v1/agent/billing/invoices/${encodeURIComponent(invoiceId)}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(tenantId ? { "x-tenant-id": tenantId } : {})
      }
    }
  );
  if (res.redirected && res.url) {
    window.location.href = res.url;
    return;
  }
  if (res.ok) {
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.location.href = blobUrl;
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return;
  }
  const json = await res.json().catch(() => null);
  throw new Error(json?.error?.message || "Invoice download failed");
}

export async function getOwnerListing(tenantId: string, listingId: string) {
  return apiClient.get<any>(`/v1/tenants/${tenantId}/listings/${listingId}`);
}

export async function validateOwnerListing(tenantId: string, listingId: string) {
  return apiClient.get<{ canSubmit: boolean; canPublish: boolean; missing: string[] }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/validate`
  );
}

export async function createOwnerListing(tenantId: string, body: PropertyListingV3) {
  const normalizedBody = {
    ...(body || {}),
    mode: (body as any)?.mode || "independent",
    dealIntent: (body as any)?.dealIntent || "sale",
    propertyType: (body as any)?.propertyType || "flat",
    title: String((body as any)?.title || "").trim() || "Draft listing",
    brokeragePartnerId:
      (body as any)?.brokeragePartnerId || "Chandrapur Real Estate Solutions Pvt Ltd"
  } as PropertyListingV3;
  assertNoLegacyKeys(normalizedBody as Record<string, any>);
  return apiClient.post<{ listingId: string }>(`/v1/tenants/${tenantId}/listings`, normalizedBody);
}

export async function patchOwnerListing(tenantId: string, listingId: string, body: Partial<PropertyListingV3>) {
  assertNoLegacyKeys(body as Record<string, any>);
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

export async function initListingMediaUpload(
  tenantId: string,
  listingId: string,
  body: { kind: "image" | "doc"; contentType: string; fileName: string; sizeBytes: number }
) {
  return apiClient.post<{ uploadUrl: string; storagePath: string; mediaId: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/media/init`,
    body
  );
}

export async function commitListingMediaUpload(
  tenantId: string,
  listingId: string,
  body: { mediaId: string; storagePath: string; kind: "image" | "doc"; isCover?: boolean; caption?: string; label?: string }
) {
  return apiClient.post<{ id: string; media: any }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/media/commit`,
    body
  );
}

export async function getListingMediaUrl(tenantId: string, listingId: string, mediaId: string) {
  return apiClient.get<{ signedGetUrl: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/media/${mediaId}/url`
  );
}

export async function publicSuggest(query: string) {
  return apiClient.get<{ items: { label: string; type: string; value?: string; propertyId?: string; projectSlug?: string }[] }>(
    `/v1/public/search/suggest${buildQuery({ q: query })}`
  );
}

export async function recordPublicPropertyView(propertyId: string, body?: { sessionId?: string }) {
  return apiClient.post<{ ok: boolean }>(`/v1/public/properties/${propertyId}/view`, body || {});
}
