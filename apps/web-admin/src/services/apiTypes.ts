export type PrincipalType = "owner" | "agent" | "agency" | "enterprise";

export type ListingDescription =
  | string
  | {
      user?: string;
      ai?: string;
      active?: "user" | "ai";
      aiMeta?: { model: string; generatedAt: string; sourceHash: string };
    };

export interface PrincipalScopeItem {
  type: PrincipalType;
  id: string;
  label: string;
  role?: string;
  orgType?: "agency" | "enterprise";
  orgId?: string;
}

export interface Agency {
  id: string;
  name: string;
  city?: string;
  email?: string;
  phone?: string;
  reraId?: string;
  legalName?: string;
  addressLine?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enterprise {
  id: string;
  name: string;
  city?: string;
  email?: string;
  phone?: string;
  reraId?: string;
  legalName?: string;
  addressLine?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Membership {
  id: string;
  orgType: "agency" | "enterprise";
  orgId: string;
  userId: string;
  role: string;
  status: "active" | "suspended";
  updatedAt?: string;
}

export interface OrgListing {
  id: string;
  principalType: "agent" | "agency" | "enterprise";
  principalId: string;
  title: string;
  propertyType: string;
  listingType: "sale" | "rent";
  lifecycleState: "draft" | "review" | "approved" | "published" | "unpublished" | "archived";
  visibility: "public" | "private";
  location?: Record<string, any>;
  pricing?: Record<string, any>;
  ownerUid?: string;
  ownerListingId?: string;
  mandateId?: string;
  enterpriseProjectId?: string;
  inventoryItemId?: string;
  description?: ListingDescription;
}

export interface Lead {
  id: string;
  tenantId: string;
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
  stage: "new" | "contacted" | "site_visit" | "negotiation" | "closed_won" | "closed_lost";
  status: { isOpen: boolean; lostReason?: string };
  assignee?: { uid: string; name?: string; role?: string };
  source?: {
    channel: "web" | "phone" | "whatsapp" | "agent" | "import";
    page?: "property" | "project" | "home" | "map" | "search";
  };
  priority: "low" | "medium" | "high";
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastContactedAt?: string;
}

export interface LeadNote {
  id: string;
  type: "note" | "call" | "whatsapp" | "email" | "system";
  text: string;
  createdAt: string;
  createdBy: { uid: string; name?: string; role?: string };
}

export interface EnterpriseProject {
  id: string;
  name: string;
  city?: string;
  status?: string;
  reraId?: string;
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  slug?: string;
  type: "apartment" | "plot" | "commercial" | "mixed";
  status: "planning" | "under_construction" | "ready";
  location?: {
    city?: string;
    area?: string;
    addressLine?: string;
    lat?: number;
    lng?: number;
  };
  priceRange?: { min?: number; max?: number; currency?: "INR" };
  possessionDate?: string;
  amenities?: string[];
  highlights?: string[];
  media?: {
    cover?: { objectPath: string; contentType?: string; fileName?: string };
    gallery?: { objectPath: string; contentType?: string; fileName?: string }[];
    brochure?: { objectPath: string; contentType?: string; fileName?: string };
  };
  visibility?: { state?: "draft" | "published"; publishedAt?: string };
  counts?: { totalUnits?: number; availableUnits?: number };
  updatedAt?: string;
}

export interface ProjectUnit {
  id: string;
  projectId: string;
  tenantId: string;
  type: string;
  availability: "available" | "blocked" | "sold";
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  media?: { floorPlan?: { objectPath: string } };
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  inventoryType: string;
  code: string;
  title?: string;
  status: string;
  areaSqFt?: number;
  priceTotal?: number;
}

export interface Mandate {
  id: string;
  ownerUid: string;
  orgType: "agent" | "agency";
  orgId: string;
  ownerListingId: string;
  status: string;
  mandateType: string;
  validFrom?: string;
  validTo?: string;
  decidedBy?: { uid: string; at?: string; reason?: string };
}

export interface OrgDoc {
  id: string;
  orgType: "agency" | "enterprise";
  orgId: string;
  category: string;
  objectPath: string;
  title?: string;
  status?: string;
  uploadedAt?: string;
}

export interface OrgVerification {
  id: string;
  orgType: "agency" | "enterprise";
  orgId: string;
  status: string;
  checklist?: Record<string, boolean>;
  notes?: string;
}

export interface BusinessRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  businessType: "agency" | "enterprise" | "builder";
  organizationName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  submittedAt?: string;
  message?: string;
  website?: string;
  gstNumber?: string;
  expectedListings?: number;
}

export interface Subscription {
  tenantId: string;
  planId: string;
  status: string;
  validFrom?: string;
  validTill?: string;
  limits?: {
    listingLimit?: number | null;
    featuredLimit?: number | null;
    agentSeats?: number;
    featuredAllowed?: boolean;
    publishAllowed?: boolean;
  };
  usage?: {
    listingsCreated?: number;
    featuredListings?: number;
    agentSeatsUsed?: number;
  };
  billing?: {
    provider?: string;
    customerId?: string;
    subscriptionId?: string;
    lastPaymentAt?: string;
  };
}

export interface TenantSummary {
  tenantId: string;
  type: string;
  enterpriseTier?: string | null;
}

export interface OnboardingSummary {
  required: boolean;
  amount: number;
  status: "pending" | "paid" | "waived";
  paidAt?: string | null;
}

export interface BillingSubscriptionResponse {
  ok: true;
  subscription: Subscription;
  tenant: TenantSummary;
  onboarding?: OnboardingSummary | null;
}

export interface ListingValidationResponse {
  canSubmit: boolean;
  canPublish: boolean;
  missing: string[];
}

export interface TeamMeResponse {
  tenantId: string;
  role: string;
  seatLimit: number;
  seatsUsed: number;
  planId: string;
  status: string;
}

export interface TeamUser {
  id: string;
  uid?: string;
  email: string;
  displayName?: string | null;
  role: string;
  status: "active" | "disabled";
  createdAt?: string;
}

export interface TeamInvite {
  inviteId: string;
  email: string;
  role: string;
  status: string;
  expiresAt?: string;
  createdAt?: string;
  usedAt?: string;
}

export interface CreateInviteResponse {
  inviteId: string;
  inviteToken: string;
}
