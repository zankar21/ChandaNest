import { apiClient } from "./apiClient";

type Status = "created" | "contacted" | "closed";

export async function listBuyerRequests(
  tenantId: string,
  params: { status?: string; citySlug?: string }
) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.citySlug) search.set("citySlug", params.citySlug);
  const qs = search.toString();
  const path = `/v1/tenants/${tenantId}/buyer-requests${qs ? `?${qs}` : ""}`;
  return apiClient.get<{ items: any[] }>(path);
}

export async function getBuyerRequest(tenantId: string, requestId: string) {
  return apiClient.get<any>(`/v1/tenants/${tenantId}/buyer-requests/${requestId}`);
}

export async function patchBuyerRequest(
  tenantId: string,
  requestId: string,
  patch: { status?: Status; notes?: string }
) {
  return apiClient.patch(`/v1/tenants/${tenantId}/buyer-requests/${requestId}`, patch);
}
