import type {
  Agency,
  AnalyticsSummary,
  Approval,
  Enterprise,
  EnterpriseProject,
  InventoryItem,
  Lead,
  LeadNote,
  Mandate,
  Membership,
  BusinessRequest,
  PlatformActivityItem,
  PlatformAnalyticsSummary,
  PlatformBuyerRequest,
  PlatformTenantDetail,
  PlatformTenantCreateResponse,
  PlatformTenantPayment,
  BillingSubscriptionResponse,
  CreateInviteResponse,
  RegenerateTenantAdminInviteResponse,
  OrgDoc,
  OrgListing,
  OrgVerification,
  PrincipalScopeItem,
  Project,
  ProjectUnit,
  Subscription,
  TeamInvite,
  TeamMeResponse,
  TeamUser,
  DocumentLockerRecord
} from "./apiTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

type ApiIssue = { path: (string | number)[]; message: string };

type ApiError = Error & {
  code?: string;
  issues?: ApiIssue[];
  status?: number;
  fields?: string[];
};

let currentIdToken: string | null = null;
let currentAppCheckToken: string | null = null;
let currentTenantId: string | null = null;
const FORBIDDEN_LEGACY_LISTING_KEYS = [
  "type",
  "purpose",
  "pricing",
  "rental",
  "visibility",
  "listingStatus",
  "status",
  "moderation",
  "price"
] as const;

export function setAuthToken(token: string | null) {
  currentIdToken = token;
}

export function setAppCheckToken(token: string | null) {
  currentAppCheckToken = token;
}

export function setTenantId(tenantId: string | null) {
  currentTenantId = tenantId;
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

function assertNoLegacyListingKeys(payload: Record<string, any>) {
  const offendingKeys = FORBIDDEN_LEGACY_LISTING_KEYS.filter((key) => key in (payload || {}));
  if (offendingKeys.length === 0) return;
  const message = `Legacy listing keys are forbidden in V3 payloads: ${offendingKeys.join(", ")}`;
  if (import.meta.env.DEV) {
    throw new Error(message);
  }
  console.error(message);
}

async function request<T>(path: string, options: RequestInit = {}, opts?: { requireAppCheck?: boolean }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };
  if (currentIdToken) headers.Authorization = `Bearer ${currentIdToken}`;
  if (currentTenantId) headers["x-tenant-id"] = currentTenantId;
  if (opts?.requireAppCheck && currentAppCheckToken) headers["X-Firebase-AppCheck"] = currentAppCheckToken;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    const message = json?.error?.message || res.statusText;
    const err = new Error(message) as ApiError;
    err.code = json?.error?.code;
    err.issues = parseIssues(json);
    err.status = res.status;
    err.fields = Array.isArray(json?.error?.fields) ? json.error.fields : undefined;
    throw err;
  }
  return json?.data as T;
}

async function requestRaw<T>(path: string, options: RequestInit = {}, opts?: { requireAppCheck?: boolean }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined)
  };
  if (currentIdToken) headers.Authorization = `Bearer ${currentIdToken}`;
  if (currentTenantId) headers["x-tenant-id"] = currentTenantId;
  if (opts?.requireAppCheck && currentAppCheckToken) headers["X-Firebase-AppCheck"] = currentAppCheckToken;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) {
    const message = json?.error?.message || res.statusText;
    const err = new Error(message) as ApiError;
    err.code = json?.error?.code;
    err.issues = parseIssues(json);
    err.status = res.status;
    err.fields = Array.isArray(json?.error?.fields) ? json.error.fields : undefined;
    throw err;
  }
  return json as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: { requireAppCheck?: boolean }) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }, opts),
  patch: <T>(path: string, body?: unknown, opts?: { requireAppCheck?: boolean }) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }, opts),
  delete: <T>(path: string, opts?: { requireAppCheck?: boolean }) => request<T>(path, { method: "DELETE" }, opts)
};

export async function getMonetizationCatalogAdmin(params?: {
  role?: "owner" | "agent" | "builder" | "enterprise";
  includeInactive?: boolean;
}) {
  return requestRaw<{ ok: true; data: { items: any[] } }>(
    `/v1/admin/monetization/catalog${buildQuery(params)}`,
    { method: "GET" }
  );
}

export async function getAdminBuilderCapSummary(tenantId: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/builder/cap-summary${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function getBuilderCapSummary() {
  return requestRaw<{ ok: true; data: any }>(`/v1/monetization/builder/cap-summary`, {
    method: "GET"
  });
}

export async function getAdminBuilderStats() {
  return requestRaw<{ ok: true; data: any }>(`/v1/admin/monetization/builder-stats`, {
    method: "GET"
  });
}

export async function getAdminAgentStats() {
  return requestRaw<{ ok: true; data: any }>(`/v1/admin/monetization/agent-stats`, {
    method: "GET"
  });
}

export async function getMonetizationHealthSummary() {
  return requestRaw<{ ok: true; data: any }>(`/v1/admin/monetization/health-summary`, {
    method: "GET"
  });
}

export async function getMonetizationWebhookAudit(params?: {
  limit?: number;
  status?: "received" | "processed" | "duplicate" | "failed";
  eventType?: string;
}) {
  return requestRaw<{ ok: true; data: { items: any[]; summary: any } }>(
    `/v1/admin/monetization/webhook-audit${buildQuery(params)}`,
    { method: "GET" }
  );
}

export async function getMonetizationErrorCodes() {
  return requestRaw<{ ok: true; data: { items: any[] } }>(`/v1/admin/monetization/error-codes`, {
    method: "GET"
  });
}

export async function getAdminListingMonetizationOps(listingId: string, tenantId?: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/listings/${encodeURIComponent(listingId)}${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function getAdminAgentMonetizationOps(uid: string, tenantId: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/agents/${encodeURIComponent(uid)}${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function getAdminOwnerMonetizationOps(uid: string, params?: { tenantId?: string; listingId?: string }) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/owners/${encodeURIComponent(uid)}${buildQuery(params)}`,
    { method: "GET" }
  );
}

export async function getAdminBuilderMonetizationOps(tenantId: string, projectId?: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/builders/${encodeURIComponent(tenantId)}${buildQuery({ projectId })}`,
    { method: "GET" }
  );
}

export async function explainMonetizedListing(listingId: string, tenantId?: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/explain/listings/${encodeURIComponent(listingId)}${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function explainMonetizedBuilderProject(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/explain/builders/${encodeURIComponent(tenantId)}/projects/${encodeURIComponent(projectId)}`,
    { method: "GET" }
  );
}

export async function resyncMonetizedListing(listingId: string, params?: { tenantId?: string; dryRun?: boolean }) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/resync/listings/${encodeURIComponent(listingId)}${buildQuery(params)}`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function resyncAgentCredits(uid: string, tenantId: string, dryRun?: boolean) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/resync/agents/${encodeURIComponent(uid)}/credits${buildQuery({ tenantId, dryRun })}`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function resyncAgentAutoRenew(uid: string, tenantId: string, params?: { listingId?: string; dryRun?: boolean }) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/resync/agents/${encodeURIComponent(uid)}/autorenew${buildQuery({
      tenantId,
      listingId: params?.listingId,
      dryRun: params?.dryRun
    })}`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function resyncBuilderUsage(tenantId: string, dryRun?: boolean) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/resync/builders/${encodeURIComponent(tenantId)}/usage${buildQuery({ dryRun })}`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function resyncOwnerListing(listingId: string, tenantId: string, dryRun?: boolean) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/admin/monetization/resync/owners/listings/${encodeURIComponent(listingId)}${buildQuery({ tenantId, dryRun })}`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function listProjectReraAllowlist(tenantId?: string) {
  return requestRaw<{ ok: true; data: { items: any[] } }>(
    `/v1/admin/monetization/project-rera-allowlist${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function getAdminProjectPublishChecklist(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: { ok: true; issues: any[] } }>(
    `/v1/admin/projects/${projectId}/publish-checklist${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function createBuilderProjectSpotlightOrder(tenantId: string, projectId: string, idempotencyKey?: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/monetization/builder/projects/${projectId}/spotlight/order`,
    {
      method: "POST",
      body: JSON.stringify({ idempotencyKey })
    }
  );
}

export async function createBuilderUnitBoostOrder(
  tenantId: string,
  projectId: string,
  unitId: string,
  idempotencyKey?: string
) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/monetization/builder/projects/${projectId}/units/${unitId}/boost/order`,
    {
      method: "POST",
      body: JSON.stringify({ idempotencyKey })
    }
  );
}

export async function createBuilderSubscriptionOrder(productId: "builder_subscription_starter_m_v1" | "builder_subscription_growth_m_v1" | "builder_subscription_enterprise_m_v1", idempotencyKey?: string) {
  return requestRaw<{ ok: true; data: any }>(
    `/v1/monetization/builder/subscription/order`,
    {
      method: "POST",
      body: JSON.stringify({ productId, idempotencyKey })
    },
    { requireAppCheck: true }
  );
}

export async function verifyMonetizationPayment(body: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return requestRaw<{ ok: true; data: any }>(`/v1/monetization/payments/verify`, {
    method: "POST",
    body: JSON.stringify(body)
  });
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

export async function getListing(tenantId: string, listingId: string) {
  return apiClient.get<any>(`/v1/tenants/${tenantId}/listings/${listingId}`);
}

export async function validateListing(tenantId: string, listingId: string) {
  return apiClient.get<{ canSubmit: boolean; canPublish: boolean; missing: string[] }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/validate`
  );
}

export async function listListings(tenantId: string) {
  return apiClient.get<{ items: any[] }>(`/v1/tenants/${tenantId}/listings`);
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>) {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return true;
  });
  if (entries.length === 0) return "";
  const query = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString();
  return query ? `?${query}` : "";
}

export const listings = {
  list: (tenantId: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    apiClient.get<{ items: any[] }>(`/v1/tenants/${tenantId}/listings${buildQuery(params)}`)
};

export async function createListing(tenantId: string, body: any) {
  assertNoLegacyListingKeys(body);
  return apiClient.post<{ listingId: string }>(`/v1/tenants/${tenantId}/listings`, body, { requireAppCheck: true });
}

export async function updateListing(tenantId: string, listingId: string, body: any) {
  assertNoLegacyListingKeys(body);
  return apiClient.patch(`/v1/tenants/${tenantId}/listings/${listingId}`, body, { requireAppCheck: true });
}

export async function submitListing(tenantId: string, listingId: string) {
  return apiClient.post<{ status: string; publishState?: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/submit`,
    {},
    { requireAppCheck: true }
  );
}

export async function publishListing(tenantId: string, listingId: string) {
  return apiClient.post<{ status: string; publishState?: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/publish`,
    {},
    { requireAppCheck: true }
  );
}

export async function approveListing(tenantId: string, listingId: string) {
  return apiClient.post<{ status: string; publishState?: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/approve`,
    {},
    { requireAppCheck: true }
  );
}

export async function rejectListing(tenantId: string, listingId: string, reason: string) {
  return apiClient.post<{ status: string; requiredAction?: string; rejectionReason?: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/reject`,
    { reason },
    { requireAppCheck: true }
  );
}

export async function setListingVisibility(
  tenantId: string,
  listingId: string,
  publishState: "published" | "draft" | "unpublished"
) {
  return apiClient.post<{ publishState: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/visibility`,
    { publishState },
    { requireAppCheck: true }
  );
}

export async function unpublishListing(tenantId: string, listingId: string) {
  return apiClient.post<{ status: string }>(
    `/v1/tenants/${tenantId}/listings/${listingId}/unpublish`,
    {},
    { requireAppCheck: true }
  );
}

export async function listProjects(tenantId: string) {
  return apiClient.get<{ items: any[] }>(`/v1/tenants/${tenantId}/projects`);
}

export async function createProjectApi(tenantId: string, body: any) {
  return apiClient.post<{ id: string }>(`/v1/tenants/${tenantId}/projects`, body, { requireAppCheck: true });
}

export async function updateProjectApi(tenantId: string, projectId: string, body: any) {
  return apiClient.patch(`/v1/tenants/${tenantId}/projects/${projectId}`, body, { requireAppCheck: true });
}

export async function listAdminProjects(
  tenantId: string,
  params?: {
    q?: string;
    type?: string;
    status?: string;
    visibility?: string;
    publishState?: string;
    recordStatus?: string;
    limit?: number;
    cursor?: string;
  }
) {
  return requestRaw<{ ok: true; data: { items: Project[]; nextCursor?: string } }>(
    `/v1/admin/projects${buildQuery({ tenantId, ...params })}`,
    { method: "GET" }
  );
}

export async function getAdminProject(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: Project }>(
    `/v1/admin/projects/${projectId}${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function createAdminProject(tenantId: string, body: Record<string, any>) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/admin/projects${buildQuery({ tenantId })}`,
    { method: "POST", body: JSON.stringify(body) },
    { requireAppCheck: true }
  );
}

export async function updateAdminProject(tenantId: string, projectId: string, body: Record<string, any>) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/admin/projects/${projectId}${buildQuery({ tenantId })}`,
    { method: "PUT", body: JSON.stringify(body) },
    { requireAppCheck: true }
  );
}

export async function deleteAdminProject(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/admin/projects/${projectId}${buildQuery({ tenantId })}`,
    { method: "DELETE" },
    { requireAppCheck: true }
  );
}

export async function publishAdminProject(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/admin/projects/${projectId}/publish${buildQuery({ tenantId })}`,
    { method: "POST", body: JSON.stringify({}) },
    { requireAppCheck: true }
  );
}

export async function unpublishAdminProject(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/admin/projects/${projectId}/unpublish${buildQuery({ tenantId })}`,
    { method: "POST", body: JSON.stringify({}) },
    { requireAppCheck: true }
  );
}

export async function listAdminProjectUnits(tenantId: string, projectId: string) {
  return requestRaw<{ ok: true; data: { items: ProjectUnit[] } }>(
    `/v1/admin/projects/${projectId}/units${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function createAdminProjectUnit(tenantId: string, projectId: string, body: Record<string, any>) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/admin/projects/${projectId}/units${buildQuery({ tenantId })}`,
    { method: "POST", body: JSON.stringify(body) },
    { requireAppCheck: true }
  );
}

export async function bulkCreateAdminProjectUnits(
  tenantId: string,
  projectId: string,
  body: { units: Record<string, any>[] }
) {
  return requestRaw<{ ok: true; data: { ids: string[] } }>(
    `/v1/admin/projects/${projectId}/units/bulk${buildQuery({ tenantId })}`,
    { method: "POST", body: JSON.stringify(body) },
    { requireAppCheck: true }
  );
}

export async function updateAdminProjectUnit(
  tenantId: string,
  projectId: string,
  unitId: string,
  body: Record<string, any>
) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/admin/projects/${projectId}/units/${unitId}${buildQuery({ tenantId })}`,
    { method: "PUT", body: JSON.stringify(body) },
    { requireAppCheck: true }
  );
}

export async function deleteAdminProjectUnit(tenantId: string, projectId: string, unitId: string) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/admin/projects/${projectId}/units/${unitId}${buildQuery({ tenantId })}`,
    { method: "DELETE" },
    { requireAppCheck: true }
  );
}

export async function signPutMedia(objectPath: string, contentType: string) {
  return apiClient.post<{ url: string; objectPath: string; expiresAt: string }>(
    "/v1/media/sign-put",
    { objectPath, contentType },
    { requireAppCheck: true }
  );
}

export async function signGetMedia(paths: string[]) {
  if (!paths || paths.length === 0) return {};
  const data = await apiClient.post<{ items: { objectPath: string; url: string }[] }>(
    "/v1/media/sign-get",
    { paths }
  );
  const map: Record<string, string> = {};
  (data.items || []).forEach((i) => {
    map[i.objectPath] = i.url;
  });
  return map;
}

export async function signDocumentLockerPut(
  tenantId: string,
  objectPath: string,
  contentType: string,
  contentLength?: number
) {
  return apiClient.post<{ url: string; objectPath: string; expiresAt: string }>(
    `/v1/tenants/${tenantId}/documents/sign-put`,
    { objectPath, contentType, contentLength },
    { requireAppCheck: true }
  );
}

export async function signDocumentLockerGet(tenantId: string, paths: string[]) {
  if (!paths || paths.length === 0) return {};
  const data = await apiClient.post<{ items: { objectPath: string; url: string }[] }>(
    `/v1/tenants/${tenantId}/documents/sign-get`,
    { paths }
  );
  const map: Record<string, string> = {};
  (data.items || []).forEach((i) => {
    map[i.objectPath] = i.url;
  });
  return map;
}

export async function listDocumentLockerRecords(
  tenantId: string,
  params?: {
    entityType?: string;
    entityId?: string;
    category?: string;
    status?: string;
    visibility?: string;
    expiringInDays?: number;
    q?: string;
    limit?: number;
  }
) {
  return requestRaw<{ ok: true; data: { items: DocumentLockerRecord[] } }>(
    `/v1/tenants/${tenantId}/documents${buildQuery(params)}`,
    { method: "GET" }
  );
}

export async function getDocumentLockerRecord(tenantId: string, documentId: string) {
  return requestRaw<{ ok: true; data: DocumentLockerRecord }>(
    `/v1/tenants/${tenantId}/documents/${encodeURIComponent(documentId)}`,
    { method: "GET" }
  );
}

export async function createDocumentLockerRecord(tenantId: string, payload: Record<string, any>) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/tenants/${tenantId}/documents`,
    { method: "POST", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function patchDocumentLockerRecord(
  tenantId: string,
  documentId: string,
  payload: Record<string, any>
) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/tenants/${tenantId}/documents/${encodeURIComponent(documentId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function replaceDocumentLockerRecord(
  tenantId: string,
  documentId: string,
  payload: Record<string, any>
) {
  return requestRaw<{ ok: true; data: { id: string; replacedDocumentId: string } }>(
    `/v1/tenants/${tenantId}/documents/${encodeURIComponent(documentId)}/replace`,
    { method: "POST", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function deleteDocumentLockerRecord(tenantId: string, documentId: string) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/tenants/${tenantId}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" },
    { requireAppCheck: true }
  );
}

export async function patchListingMedia(tenantId: string, listingId: string, media: { hero?: any; gallery?: any[] }) {
  return apiClient.patch(`/v1/tenants/${tenantId}/listings/${listingId}`, { media }, { requireAppCheck: true });
}

export async function generateListingAIDescription(
  tenantId: string,
  listingId: string,
  payload?: { setActive?: boolean; force?: boolean }
) {
  return requestRaw<{ ok: true; data: { skipped: boolean; description?: any } }>(
    `/v1/admin/listings/${listingId}/ai-description/generate${buildQuery({ tenantId })}`,
    {
      method: "POST",
      body: JSON.stringify(payload || {})
    }
  );
}

export async function patchProjectMedia(tenantId: string, projectId: string, media: { hero?: any; gallery?: any[] }) {
  return requestRaw<{ ok: true; data: { id: string } }>(
    `/v1/admin/projects/${projectId}${buildQuery({ tenantId })}`,
    {
      method: "PUT",
      body: JSON.stringify({
        media: {
          cover: media.hero,
          gallery: media.gallery
        }
      })
    },
    { requireAppCheck: true }
  );
}

export async function getMyPrincipals(tenantId: string) {
  return requestRaw<{ ok: true; tenantId: string; principals: PrincipalScopeItem[] }>(
    `/v1/tenants/${tenantId}/principals/me`
  );
}

export async function createAgency(tenantId: string, payload: Record<string, any>) {
  return apiClient.post<{ agencyId: string }>(`/v1/tenants/${tenantId}/agencies`, payload);
}

export async function listAgencies(tenantId: string) {
  return apiClient.get<{ items?: Agency[]; agencies?: Agency[] }>(`/v1/tenants/${tenantId}/agencies`);
}

export async function getAgency(tenantId: string, agencyId: string) {
  return apiClient.get<Agency>(`/v1/tenants/${tenantId}/agencies/${agencyId}`);
}

export async function listAgencyMembers(tenantId: string, agencyId: string) {
  return apiClient.get<{ items?: Membership[]; members?: Membership[] }>(
    `/v1/tenants/${tenantId}/agencies/${agencyId}/members`
  );
}

export async function addAgencyMember(tenantId: string, agencyId: string, payload: Record<string, any>) {
  return apiClient.post<{ membershipId: string }>(
    `/v1/tenants/${tenantId}/agencies/${agencyId}/members`,
    payload
  );
}

export async function patchAgencyMember(
  tenantId: string,
  agencyId: string,
  membershipId: string,
  payload: Record<string, any>
) {
  return apiClient.patch(
    `/v1/tenants/${tenantId}/agencies/${agencyId}/members/${membershipId}`,
    payload
  );
}

export async function createEnterprise(tenantId: string, payload: Record<string, any>) {
  return apiClient.post<{ enterpriseId: string }>(`/v1/tenants/${tenantId}/enterprises`, payload);
}

export async function listEnterprises(tenantId: string) {
  return apiClient.get<{ items?: Enterprise[]; enterprises?: Enterprise[] }>(
    `/v1/tenants/${tenantId}/enterprises`
  );
}

export async function getEnterprise(tenantId: string, enterpriseId: string) {
  return apiClient.get<Enterprise>(`/v1/tenants/${tenantId}/enterprises/${enterpriseId}`);
}

export async function listEnterpriseMembers(tenantId: string, enterpriseId: string) {
  return apiClient.get<{ items?: Membership[]; members?: Membership[] }>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/members`
  );
}

export async function addEnterpriseMember(tenantId: string, enterpriseId: string, payload: Record<string, any>) {
  return apiClient.post<{ membershipId: string }>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/members`,
    payload
  );
}

export async function patchEnterpriseMember(
  tenantId: string,
  enterpriseId: string,
  membershipId: string,
  payload: Record<string, any>
) {
  return apiClient.patch(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/members/${membershipId}`,
    payload
  );
}

export async function createOrgListing(tenantId: string, payload: Record<string, any>) {
  return apiClient.post<{ id: string }>(`/v1/tenants/${tenantId}/org-listings`, payload);
}

export async function listOrgListings(
  tenantId: string,
  params?: { principalType?: string; principalId?: string; lifecycleState?: string }
) {
  return apiClient.get<{ items: OrgListing[] }>(
    `/v1/tenants/${tenantId}/org-listings${buildQuery(params)}`
  );
}

export async function getOrgListing(tenantId: string, orgListingId: string) {
  return apiClient.get<OrgListing>(`/v1/tenants/${tenantId}/org-listings/${orgListingId}`);
}

export async function patchOrgListing(tenantId: string, orgListingId: string, payload: Record<string, any>) {
  return apiClient.patch(`/v1/tenants/${tenantId}/org-listings/${orgListingId}`, payload);
}

export async function transitionOrgListing(
  tenantId: string,
  orgListingId: string,
  payload: { action: string; note?: string }
) {
  return apiClient.post(
    `/v1/tenants/${tenantId}/org-listings/${orgListingId}/transition`,
    payload
  );
}

export async function listLeads(
  tenantId: string,
  params?: { q?: string; stage?: string; assignee?: string; from?: string; to?: string; limit?: number; cursor?: string }
) {
  return apiClient.get<{ items: Lead[]; nextCursor?: string }>(
    `/v1/admin/leads${buildQuery({ tenantId, ...params })}`
  );
}

export async function getLead(tenantId: string, leadId: string) {
  return apiClient.get<Lead>(`/v1/admin/leads/${leadId}${buildQuery({ tenantId })}`);
}

export async function createLead(tenantId: string, payload: Record<string, any>) {
  return apiClient.post<{ leadId: string }>(
    `/v1/admin/leads${buildQuery({ tenantId })}`,
    payload,
    { requireAppCheck: true }
  );
}

export async function updateLead(tenantId: string, leadId: string, payload: Record<string, any>) {
  return requestRaw<{ ok: true; data: { leadId: string } }>(
    `/v1/admin/leads/${leadId}${buildQuery({ tenantId })}`,
    { method: "PUT", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function assignLead(tenantId: string, leadId: string, payload: { uid: string; name?: string; role?: string }) {
  return apiClient.post<{ leadId: string }>(
    `/v1/admin/leads/${leadId}/assign${buildQuery({ tenantId })}`,
    payload,
    { requireAppCheck: true }
  );
}

export async function updateLeadStage(
  tenantId: string,
  leadId: string,
  payload: { stage: string; lostReason?: string }
) {
  return apiClient.post<{ leadId: string }>(
    `/v1/admin/leads/${leadId}/stage${buildQuery({ tenantId })}`,
    payload,
    { requireAppCheck: true }
  );
}

export async function listLeadNotes(tenantId: string, leadId: string) {
  return apiClient.get<{ items: LeadNote[] }>(
    `/v1/admin/leads/${leadId}/notes${buildQuery({ tenantId })}`
  );
}

export async function addLeadNote(
  tenantId: string,
  leadId: string,
  payload: { type: "note" | "call" | "whatsapp" | "email" | "system"; text: string }
) {
  return apiClient.post<{ noteId: string }>(
    `/v1/admin/leads/${leadId}/notes${buildQuery({ tenantId })}`,
    payload,
    { requireAppCheck: true }
  );
}

export async function createEnterpriseProject(
  tenantId: string,
  enterpriseId: string,
  payload: Record<string, any>
) {
  return apiClient.post<{ projectId: string }>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects`,
    payload
  );
}

export async function listEnterpriseProjects(tenantId: string, enterpriseId: string) {
  return apiClient.get<{ items: EnterpriseProject[] }>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects`
  );
}

export async function getEnterpriseProject(tenantId: string, enterpriseId: string, projectId: string) {
  return apiClient.get<EnterpriseProject>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}`
  );
}

export async function patchEnterpriseProject(
  tenantId: string,
  enterpriseId: string,
  projectId: string,
  payload: Record<string, any>
) {
  return apiClient.patch(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}`,
    payload
  );
}

export async function createInventoryItem(
  tenantId: string,
  enterpriseId: string,
  projectId: string,
  payload: Record<string, any>
) {
  return apiClient.post<{ itemId: string }>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}/inventory`,
    payload
  );
}

export async function listInventoryItems(
  tenantId: string,
  enterpriseId: string,
  projectId: string,
  params?: { status?: string; inventoryType?: string }
) {
  return apiClient.get<{ items: InventoryItem[] }>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}/inventory${buildQuery(params)}`
  );
}

export async function getInventoryItem(
  tenantId: string,
  enterpriseId: string,
  projectId: string,
  itemId: string
) {
  return apiClient.get<InventoryItem>(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}/inventory/${itemId}`
  );
}

export async function patchInventoryItem(
  tenantId: string,
  enterpriseId: string,
  projectId: string,
  itemId: string,
  payload: Record<string, any>
) {
  return apiClient.patch(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}/inventory/${itemId}`,
    payload
  );
}

export async function patchInventoryStatus(
  tenantId: string,
  enterpriseId: string,
  projectId: string,
  itemId: string,
  status: string
) {
  return apiClient.patch(
    `/v1/tenants/${tenantId}/enterprises/${enterpriseId}/projects/${projectId}/inventory/${itemId}/status`,
    { status }
  );
}

export async function requestMandate(tenantId: string, payload: Record<string, any>) {
  return apiClient.post<{ mandateId: string }>(`/v1/tenants/${tenantId}/mandates/request`, payload);
}

export async function listMandates(
  tenantId: string,
  params?: { status?: string; orgType?: string; orgId?: string }
) {
  return apiClient.get<{ items: Mandate[] }>(`/v1/tenants/${tenantId}/mandates${buildQuery(params)}`);
}

export async function getMandate(tenantId: string, mandateId: string) {
  return apiClient.get<Mandate>(`/v1/tenants/${tenantId}/mandates/${mandateId}`);
}

export async function approveMandate(tenantId: string, mandateId: string, payload: Record<string, any>) {
  return apiClient.post(`/v1/tenants/${tenantId}/mandates/${mandateId}/approve`, payload);
}

export async function rejectMandate(tenantId: string, mandateId: string, reason: string) {
  return apiClient.post(`/v1/tenants/${tenantId}/mandates/${mandateId}/reject`, { reason });
}

export async function revokeMandate(tenantId: string, mandateId: string, reason?: string) {
  return apiClient.post(`/v1/tenants/${tenantId}/mandates/${mandateId}/revoke`, { reason });
}

export async function registerOrgDoc(tenantId: string, payload: Record<string, any>) {
  return apiClient.post<{ docId: string }>(`/v1/tenants/${tenantId}/org-docs`, payload);
}

export async function listOrgDocs(
  tenantId: string,
  params: { orgType: string; orgId: string; category?: string }
) {
  return apiClient.get<{ items: OrgDoc[] }>(`/v1/tenants/${tenantId}/org-docs${buildQuery(params)}`);
}

export async function patchOrgDoc(tenantId: string, docId: string, payload: Record<string, any>) {
  return apiClient.patch(`/v1/tenants/${tenantId}/org-docs/${docId}`, payload);
}

export async function getOrgVerification(tenantId: string, orgType: string, orgId: string) {
  return apiClient.get<OrgVerification>(`/v1/tenants/${tenantId}/org-verification/${orgType}/${orgId}`);
}

export async function initOrgVerification(tenantId: string, orgType: string, orgId: string) {
  return apiClient.post<OrgVerification>(
    `/v1/tenants/${tenantId}/org-verification/${orgType}/${orgId}/init`,
    {}
  );
}

export async function decideOrgVerification(
  tenantId: string,
  orgType: string,
  orgId: string,
  payload: Record<string, any>
) {
  return apiClient.post(
    `/v1/tenants/${tenantId}/org-verification/${orgType}/${orgId}/decide`,
    payload
  );
}

export async function listBusinessRequests(status: "pending" | "approved" | "rejected") {
  return requestRaw<{ ok: true; items: BusinessRequest[]; nextCursor?: string }>(
    `/v1/admin/business-requests${buildQuery({ status, limit: 50 })}`,
    { method: "GET" }
  );
}

export async function approveBusinessRequest(
  requestId: string,
  payload: { plan?: string; tenantSlug?: string }
) {
  return requestRaw<{ ok: true; tenantId: string; inviteId: string; inviteToken: string }>(
    `/v1/admin/business-requests/${requestId}/approve`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function rejectBusinessRequest(requestId: string, reason: string) {
  return requestRaw<{ ok: true }>(`/v1/admin/business-requests/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function acceptPublicInvite(token: string, uid: string) {
  return requestRaw<{ ok: true; tenantId: string; role: string }>(`/v1/public/invites/accept`, {
    method: "POST",
    body: JSON.stringify({ token, uid })
  });
}

export async function regeneratePlatformTenantAdminInvite(tenantId: string) {
  return requestRaw<{ ok: true; data: RegenerateTenantAdminInviteResponse }>(
    `/v1/platform/tenants/${tenantId}/admin-invite/regenerate`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function getPlatformAnalyticsSummary() {
  return requestRaw<{ ok: true; data: PlatformAnalyticsSummary }>(`/v1/platform/analytics/summary`, {
    method: "GET"
  });
}

export async function listPlatformActivity(limit = 8) {
  return requestRaw<{ ok: true; data: { items: PlatformActivityItem[] } }>(
    `/v1/platform/analytics/activity${buildQuery({ limit })}`,
    { method: "GET" }
  );
}

export async function listPlatformBuyerRequests(params: { status?: string; citySlug?: string } = {}) {
  return requestRaw<{ ok: true; data: { items: PlatformBuyerRequest[] } }>(
    `/v1/platform/buyer-requests${buildQuery(params)}`,
    { method: "GET" }
  );
}

export async function getPlatformBuyerRequest(requestId: string) {
  return requestRaw<{ ok: true; data: PlatformBuyerRequest }>(
    `/v1/platform/buyer-requests/${encodeURIComponent(requestId)}`,
    { method: "GET" }
  );
}

export async function patchPlatformBuyerRequest(
  requestId: string,
  patch: { status?: "created" | "contacted" | "closed"; notes?: string; assignedTenantId?: string | null }
) {
  return requestRaw<{ ok: true; data: { requestId: string } }>(
    `/v1/platform/buyer-requests/${encodeURIComponent(requestId)}`,
    { method: "PATCH", body: JSON.stringify(patch) }
  );
}

export async function createPlatformTenant(payload: Record<string, any>) {
  return requestRaw<{ ok: true; data: PlatformTenantCreateResponse }>(`/v1/platform/tenants`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function downloadTenantOnboardingPack(tenantId: string) {
  const headers: Record<string, string> = {};
  if (currentIdToken) headers.Authorization = `Bearer ${currentIdToken}`;
  if (currentTenantId) headers["x-tenant-id"] = currentTenantId;
  const res = await fetch(`${API_BASE}/v1/platform/tenants/${encodeURIComponent(tenantId)}/onboarding-pack.pdf`, {
    method: "GET",
    headers
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error?.message || res.statusText || "Failed to download onboarding pack");
  }
  return res.blob();
}

export async function getPlatformTenantDetail(tenantId: string) {
  return requestRaw<{ ok: true; data: PlatformTenantDetail }>(
    `/v1/platform/tenants/${encodeURIComponent(tenantId)}`,
    { method: "GET" }
  );
}

export async function updatePlatformTenantStatus(tenantId: string, status: "active" | "suspended" | "closed") {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/platform/tenants/${encodeURIComponent(tenantId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

export async function listPlatformTenantPayments(tenantId: string) {
  return requestRaw<{ ok: true; data: { items: PlatformTenantPayment[] } }>(
    `/v1/platform/tenants/${encodeURIComponent(tenantId)}/payments`,
    { method: "GET" }
  );
}

export async function createPlatformTenantPayment(
  tenantId: string,
  payload: {
    billingCycle?: "monthly" | "yearly";
    periodStart: string;
    periodEnd: string;
    amount: number;
    mode: "NEFT" | "RTGS" | "IMPS" | "Cheque";
    reference: string;
    txnDate: string;
    notes?: string;
  }
) {
  return requestRaw<{ ok: true; data: { paymentId: string } }>(
    `/v1/platform/tenants/${encodeURIComponent(tenantId)}/payments`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export async function verifyPlatformTenantPayment(tenantId: string, paymentId: string) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/platform/tenants/${encodeURIComponent(tenantId)}/payments/${encodeURIComponent(paymentId)}/verify`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function rejectPlatformTenantPayment(tenantId: string, paymentId: string, reason: string) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/platform/tenants/${encodeURIComponent(tenantId)}/payments/${encodeURIComponent(paymentId)}/reject`,
    { method: "POST", body: JSON.stringify({ reason }) }
  );
}

export async function getBillingSubscription(tenantId?: string) {
  return requestRaw<BillingSubscriptionResponse>(
    `/v1/admin/billing/subscription${buildQuery({ tenantId })}`,
    { method: "GET" }
  );
}

export async function overrideSubscription(payload: {
  tenantId: string;
  planId: string;
  status: string;
  validTill?: string;
}) {
  return requestRaw<{ ok: true }>(`/v1/admin/billing/subscription/override`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function cancelSubscription() {
  return requestRaw<{ ok: true }>(`/v1/admin/billing/subscription/cancel`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function overrideOnboarding(payload: { tenantId: string; status: string; amount?: number }) {
  return requestRaw<{ ok: true }>(`/v1/admin/billing/onboarding/override`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getTeamMe(tenantId?: string) {
  return requestRaw<{ ok: true } & TeamMeResponse>(`/v1/admin/team/me${buildQuery({ tenantId })}`, {
    method: "GET"
  });
}

export async function listTeamUsers(tenantId?: string) {
  return requestRaw<{ ok: true; users: TeamUser[] }>(`/v1/admin/team/users${buildQuery({ tenantId })}`, {
    method: "GET"
  });
}

export async function createTeamInvite(
  payload: { email: string; role: string; displayName?: string },
  tenantId?: string
) {
  return requestRaw<{ ok: true } & CreateInviteResponse>(`/v1/admin/team/invites${buildQuery({ tenantId })}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listTeamInvites(status?: string, tenantId?: string) {
  return requestRaw<{ ok: true; invites: TeamInvite[] }>(
    `/v1/admin/team/invites${buildQuery({ status, tenantId })}`,
    { method: "GET" }
  );
}

export async function revokeTeamInvite(inviteId: string, tenantId?: string) {
  return requestRaw<{ ok: true }>(`/v1/admin/team/invites/${inviteId}/revoke${buildQuery({ tenantId })}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function disableTeamUser(uid: string, tenantId?: string) {
  return requestRaw<{ ok: true }>(`/v1/admin/team/users/${uid}/disable${buildQuery({ tenantId })}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function enableTeamUser(uid: string, tenantId?: string) {
  return requestRaw<{ ok: true }>(`/v1/admin/team/users/${uid}/enable${buildQuery({ tenantId })}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function listApprovals(
  tenantId: string,
  params?: {
    status?: string;
    entityType?: string;
    requestedByUid?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }
) {
  return requestRaw<{ ok: true; data: { items: Approval[]; nextCursor?: string } }>(
    `/v1/tenants/${tenantId}/admin/approvals${buildQuery(params)}`,
    { method: "GET" }
  );
}

export async function approveApproval(tenantId: string, approvalId: string, payload?: { notes?: string }) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/tenants/${tenantId}/admin/approvals/${approvalId}/approve`,
    { method: "POST", body: JSON.stringify(payload || {}) },
    { requireAppCheck: true }
  );
}

export async function rejectApproval(
  tenantId: string,
  approvalId: string,
  payload: { reason: string; notes?: string }
) {
  return requestRaw<{ ok: true; data: { ok: true } }>(
    `/v1/tenants/${tenantId}/admin/approvals/${approvalId}/reject`,
    { method: "POST", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function bulkApproveApprovals(tenantId: string, payload: { ids: string[]; notes?: string }) {
  return requestRaw<{ ok: true; data: { results: { id: string; ok: boolean; error?: string }[] } }>(
    `/v1/tenants/${tenantId}/admin/approvals/bulk/approve`,
    { method: "POST", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function bulkRejectApprovals(
  tenantId: string,
  payload: { ids: string[]; reason: string; notes?: string }
) {
  return requestRaw<{ ok: true; data: { results: { id: string; ok: boolean; error?: string }[] } }>(
    `/v1/tenants/${tenantId}/admin/approvals/bulk/reject`,
    { method: "POST", body: JSON.stringify(payload) },
    { requireAppCheck: true }
  );
}

export async function getAnalyticsSummary(tenantId: string, range: string = "30d") {
  return requestRaw<{ ok: true; data: AnalyticsSummary }>(
    `/v1/tenants/${tenantId}/admin/analytics/summary${buildQuery({ range })}`,
    { method: "GET" }
  );
}

