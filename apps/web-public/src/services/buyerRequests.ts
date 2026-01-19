import { apiClient } from "./apiClient";

export type BuyerRequestPayload = {
  citySlug: string;
  intent: "buy" | "rent" | "invest" | "lease" | "other";
  property: { category: string; type: string; bhk?: number };
  budget: { currency: string; min?: number; max?: number };
  localityText: string;
  mustHaves: string[];
  dealBreakers: string[];
  consent: { granted: true; partnerShare: boolean; at: string };
  buyer: { name?: string; phone: string; preferredCallTime?: string };
};

export async function createBuyerRequest(payload: BuyerRequestPayload) {
  return apiClient.post<{ requestId: string }>("/v1/public/buyer-requests", payload);
}
