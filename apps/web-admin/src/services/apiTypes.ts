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
  developerName?: string;
  rera?: { number?: string; authority?: string };
  addressLine?: string;
  propertyTypesSupported?: string[];
  possessionStatus?: "ready" | "under_construction";
  possessionDate?: string;
  launchDate?: string;
  completionDate?: string;
  totalUnitsPlanned?: number;
  configurationMix?: { bhk1?: number; bhk2?: number; bhk3?: number; bhk4?: number };
  plotDetails?: {
    totalLandArea?: number;
    totalLandAreaUnit?: "sq_ft" | "sq_m" | "acre" | "hectare";
    totalPlotsPlanned?: number;
    plotSizeSqFt?: number;
    plotCount?: number;
    plotInventories?: {
      sizeSqFt?: number;
      sizeValue?: number;
      sizeUnit?: "sq_ft" | "sq_m" | "acre" | "hectare";
      count: number;
      label?: string;
      frontageFt?: number;
      depthFt?: number;
    }[];
    approvals?: {
      layoutApproved?: boolean;
      naApproved?: boolean;
      tpApproved?: boolean;
    };
    layoutApproval?: {
      authority?: string;
      approvalNo?: string;
      approvalDate?: string;
    };
    naOrder?: {
      orderNo?: string;
      orderDate?: string;
    };
    tpApproval?: {
      office?: string;
      approvalNo?: string;
    };
    revenue?: {
      mouza?: string;
      taluka?: string;
      district?: string;
      state?: string;
      surveyNo?: string;
      gatNo?: string;
    };
    infra?: {
      internalRoadType?: string;
      typicalRoadWidthFeet?: number;
      waterAvailable?: boolean;
      electricityAvailable?: boolean;
      drainageAvailable?: boolean;
      streetLights?: boolean;
      boundaryWall?: boolean;
      sewageSystem?: "septic" | "underground_drainage";
      waterSource?: "borewell" | "municipal" | "both";
    };
    frontageFt?: number;
    depthFt?: number;
    plotSeries?: string;
    gatedCommunity?: boolean;
    layoutAuthority?: string;
    layoutApprovalNo?: string;
    layoutApprovalDate?: string;
    naOrderNo?: string;
    naOrderDate?: string;
    tpOffice?: string;
    tpApprovalNo?: string;
    mouza?: string;
    surveyNo?: string;
    gatNo?: string;
    hissaNo?: string;
    plotNo?: string;
    taluka?: string;
    district?: string;
    roadWidthM?: number;
    roadWidthFeet?: number;
    roadType?: string;
    internalRoadType?: "cc" | "asphalt" | "wbm";
    waterConnection?: boolean;
    electricityConnection?: boolean;
    drainageConnection?: boolean;
    waterSource?: "borewell" | "municipal" | "both";
    sewageSystem?: "septic" | "underground_drainage";
    boundaryWall?: boolean;
    bankLoanApproved?: boolean;
    bankLoanReady?: boolean;
    approvedBanks?: string[];
    possessionTimeline?: "ready" | "6_months" | "12_months" | "18_months" | "2_years" | "3_years";
    possessionTimelineNote?: string;
    electricityAvailable?: boolean;
    waterAvailable?: boolean;
    sewageAvailable?: boolean;
    titleClear?: boolean;
    litigation?: boolean;
  };
  approvals?: {
    layoutApproved?: boolean;
    naApproved?: boolean;
    fireNocApproved?: boolean;
    ocApproved?: boolean;
    ccApproved?: boolean;
    liftInspectionApproved?: boolean;
    tradeLicenseReady?: boolean;
  };
  priceRange?: { min?: number; max?: number; currency?: "INR" };
  amenities?: string[];
  highlights?: string[];
  commercialMix?: {
    shopUnits?: number;
    kiosks?: number;
    foodCourtUnits?: number;
    anchorStores?: number;
    officeUnits?: number;
  };
  commercialDetails?: {
    typicalUnitSizeMinSqFt?: number;
    typicalUnitSizeMaxSqFt?: number;
    parkingNotes?: string;
    footfallEstimateMinPerDay?: number;
    footfallEstimateMaxPerDay?: number;
    frontageVisibility?: "High" | "Medium" | "Low";
    mainRoadAccess?: boolean;
    nearbyAnchor?: string;
  };
  mixedUseIncludes?: { residential?: boolean; commercial?: boolean; plotted?: boolean };
  mixedDetails?: {
    kind: "township" | "mixed_building";
    totalLandArea?: number;
    landAreaUnit?: "sqft" | "acre" | "hectare";
    phasesCount?: number;
    sectorsCount?: number;
    internalRoads?: { roadType?: string; minWidthM?: number };
    openSpacePct?: number;
    masterPlanNotes?: string;
    buildingName?: string;
    towersCount?: number;
    totalFloors?: number;
    podiumParking?: boolean;
    retailFloors?: number;
    residentialFloors?: number;
  };
}

export interface Project {
  id: string;
  tenantId: string;
  developerName?: string;
  developer?: {
    logo?: { objectPath: string; url?: string; contentType?: string } | null;
    experienceYears?: number;
    completedProjectsCount?: number;
    ongoingProjectsCount?: number;
  };
  name: string;
  slug?: string;
  category?: "residential" | "plotted" | "commercial" | "mixed";
  type:
    | "apartment"
    | "villa"
    | "row_house"
    | "plot_layout"
    | "shop"
    | "office"
    | "showroom"
    | "township"
    | "mixed_building";
  lifecycleStatus?: string;
  recordStatus?: string;
  status: "planning" | "under_construction" | "ready" | "layout_approved" | "na_approved" | "ready_for_sale";
  possessionStatus?: "ready" | "under_construction";
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
  priceRange?: { min?: number; max?: number; currency?: "INR" };
  rera?: { number?: string; authority?: string };
  approvals?: {
    layoutApproved?: boolean;
    naApproved?: boolean;
    fireNocApproved?: boolean;
    ocApproved?: boolean;
    ccApproved?: boolean;
    liftInspectionApproved?: boolean;
    tradeLicenseReady?: boolean;
  };
  launchDate?: string;
  completionDate?: string;
  totalUnitsPlanned?: number;
  configurationMix?: { bhk1?: number; bhk2?: number; bhk3?: number; bhk4?: number };
  commercialMix?: {
    shopUnits?: number;
    kiosks?: number;
    foodCourtUnits?: number;
    anchorStores?: number;
    officeUnits?: number;
  };
  plotDetails?: {
    totalLandArea?: number;
    totalLandAreaUnit?: "sq_ft" | "sq_m" | "acre" | "hectare";
    totalPlotsPlanned?: number;
    plotSizeSqFt?: number;
    plotCount?: number;
    plotInventories?: {
      sizeSqFt?: number;
      sizeValue?: number;
      sizeUnit?: "sq_ft" | "sq_m" | "acre" | "hectare";
      count: number;
      label?: string;
      frontageFt?: number;
      depthFt?: number;
    }[];
    approvals?: {
      layoutApproved?: boolean;
      naApproved?: boolean;
      tpApproved?: boolean;
    };
    layoutApproval?: {
      authority?: string;
      approvalNo?: string;
      approvalDate?: string;
    };
    naOrder?: {
      orderNo?: string;
      orderDate?: string;
    };
    tpApproval?: {
      office?: string;
      approvalNo?: string;
    };
    revenue?: {
      mouza?: string;
      taluka?: string;
      district?: string;
      state?: string;
      surveyNo?: string;
      gatNo?: string;
    };
    infra?: {
      internalRoadType?: string;
      typicalRoadWidthFeet?: number;
      waterAvailable?: boolean;
      electricityAvailable?: boolean;
      drainageAvailable?: boolean;
      streetLights?: boolean;
      boundaryWall?: boolean;
      sewageSystem?: "septic" | "underground_drainage";
      waterSource?: "borewell" | "municipal" | "both";
    };
    frontageFt?: number;
    depthFt?: number;
    plotSeries?: string;
    gatedCommunity?: boolean;
    layoutAuthority?: string;
    layoutApprovalNo?: string;
    layoutApprovalDate?: string;
    naOrderNo?: string;
    naOrderDate?: string;
    tpOffice?: string;
    tpApprovalNo?: string;
    mouza?: string;
    surveyNo?: string;
    gatNo?: string;
    hissaNo?: string;
    plotNo?: string;
    taluka?: string;
    district?: string;
    roadWidthM?: number;
    roadWidthFeet?: number;
    roadType?: string;
    internalRoadType?: "cc" | "asphalt" | "wbm";
    waterConnection?: boolean;
    electricityConnection?: boolean;
    drainageConnection?: boolean;
    waterSource?: "borewell" | "municipal" | "both";
    sewageSystem?: "septic" | "underground_drainage";
    boundaryWall?: boolean;
    bankLoanApproved?: boolean;
    bankLoanReady?: boolean;
    approvedBanks?: string[];
    possessionTimeline?: "ready" | "6_months" | "12_months" | "18_months" | "2_years" | "3_years";
    possessionTimelineNote?: string;
    electricityAvailable?: boolean;
    waterAvailable?: boolean;
    sewageAvailable?: boolean;
    titleClear?: boolean;
    litigation?: boolean;
  };
  commercialDetails?: {
    typicalUnitSizeMinSqFt?: number;
    typicalUnitSizeMaxSqFt?: number;
    parkingNotes?: string;
    footfallEstimateMinPerDay?: number;
    footfallEstimateMaxPerDay?: number;
    frontageVisibility?: "High" | "Medium" | "Low";
    mainRoadAccess?: boolean;
    nearbyAnchor?: string;
  };
  salesStatus?: {
    preLaunch?: boolean;
    bookingOpen?: boolean;
    constructionLinkedPlan?: boolean;
    subventionPlan?: boolean;
  };
  flags?: {
    featured?: boolean;
    verified?: boolean;
    exclusivePartner?: boolean;
    premiumPosition?: number;
  };
  seo?: {
    title?: string;
    description?: string;
    shortDescription?: string;
    longDescription?: string;
    metaTitle?: string;
    metaDescription?: string;
  };
  mixedIncludes?: { residential?: boolean; commercial?: boolean; plotted?: boolean };
  mixedUseIncludes?: { residential?: boolean; commercial?: boolean; plotted?: boolean };
  mixedDetails?: {
    kind: "township" | "mixed_building";
    totalLandArea?: number;
    landAreaUnit?: "sqft" | "acre" | "hectare";
    phasesCount?: number;
    sectorsCount?: number;
    internalRoads?: { roadType?: string; minWidthM?: number };
    openSpacePct?: number;
    masterPlanNotes?: string;
    buildingName?: string;
    towersCount?: number;
    totalFloors?: number;
    podiumParking?: boolean;
    retailFloors?: number;
    residentialFloors?: number;
  };
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
  unitNumber?: string;
  tower?: string;
  bhk?: number;
  configurationLabel?: string;
  plotLengthFeet?: number;
  plotWidthFeet?: number;
  plotAreaSqFt?: number;
  revenue?: {
    surveyNo?: string;
    gatNo?: string;
    hissaNo?: string;
  };
  surveyNo?: string;
  gatNo?: string;
  hissaNo?: string;
  roadWidthFeet?: number;
  corner?: boolean;
  cornerPremiumPct?: number;
  finalPrice?: number;
  floorsType?: "G" | "G+1" | "G+2";
  parkingSlots?: number;
  privateGardenSqFt?: number;
  commercialUse?: string;
  saleableSqFt?: number;
  frontageFeet?: number;
  depthFeet?: number;
  ceilingHeightFeet?: number;
  shutterType?: "manual" | "motorized";
  powerLoadKw?: number;
  washroom?: boolean;
  waterConnection?: boolean;
  fireSafetyReady?: boolean;
  signageAllowed?: boolean;
  dedicatedParking?: number;
  visibilityScore?: "low" | "medium" | "high";
  footfallGrade?: "low" | "medium" | "high";
  nearEntrance?: boolean;
  nearEscalator?: boolean;
  nearAnchor?: boolean;
  tenancyType?: "sale" | "rent" | "lease" | "license";
  monthlyRentExpected?: number;
  depositExpected?: number;
  camPerSqFt?: number;
  propertyTaxMonthly?: number;
  fitoutStatus?: "shell" | "semi-furnished" | "furnished";
  possession?: "ready" | "under_construction";
  cabinsCount?: number;
  workstationsCapacity?: number;
  meetingRoomsCount?: number;
  pantry?: boolean;
  acProvision?: "central" | "split_ready" | "none";
  internetReady?: boolean;
  powerBackup?: boolean;
  furnishing?: "unfurnished" | "semi_furnished" | "furnished";
  glassFacade?: boolean;
  displayAreaSqFt?: number;
  storageAreaSqFt?: number;
  loadingAccess?: boolean;
  signageType?: "standard" | "large" | "facade" | "totem";
  roadExposure?: "highway" | "main_road" | "market_road" | "internal_road";
  remarks?: string;
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  area?: {
    areaSqFt?: number;
    carpetSqFt?: number;
    builtUpSqFt?: number;
    superBuiltUpSqFt?: number;
  };
  pricing?: {
    basePrice?: number;
    allInclusivePrice?: number;
    pricePerSqFt?: number;
    bookingAmount?: number;
    maintenanceMonthly?: number;
    currency?: "INR";
  };
  floorInfo?: {
    number?: number;
    totalFloors?: number;
  };
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
  tenantId?: string;
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
  interestedPlan?: "trial" | "starter" | "growth" | "premium";
  serviceAreas?: string[];
  yearsInBusiness?: number;
  reraId?: string;
  preferredContact?: "call" | "whatsapp" | "email";
  bestTimeToContact?: "morning" | "afternoon" | "evening";
  billingCycle?: "monthly" | "yearly" | string;
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
  approvedPlanId?: string | null;
  paymentStatus?: string | null;
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

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalEntityType = "listing" | "project" | "kyc";

export interface ApprovalHistoryEvent {
  action: "requested" | "approved" | "rejected";
  byUid: string;
  byRole?: string | null;
  at?: any;
  reason?: string | null;
  notes?: string | null;
}

export interface Approval {
  id: string;
  tenantId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  status: ApprovalStatus;
  requestedByUid: string;
  requestedAt?: any;
  decidedByUid?: string | null;
  decidedAt?: any;
  reason?: string | null;
  notes?: string | null;
  history?: ApprovalHistoryEvent[];
}

export interface AnalyticsSummary {
  listings: {
    drafts: number;
    submitted: number;
    published: number;
    draftToPublishedPct: number;
    avgTimeToPublishHours: number | null;
  };
  leads: {
    total: number;
    byStage: Record<string, number>;
    conversionPct: number;
    unassigned: number;
  };
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
  };
  revenue: {
    subscriptionsActive: number;
    mrrEstimate: number | null;
    invoicesCount: number;
    billingCycle?: string | null;
    currentPlanAmount?: number | null;
    lastPaymentAt?: string | null;
  };
}

export interface PlatformAnalyticsSummary {
  tenants: {
    total: number;
    active: number;
    trial: number;
  };
  listings: {
    total: number;
    published: number;
  };
  leads: {
    total: number;
  };
  approvals: {
    pending: number;
  };
  onboarding: {
    businessRequestsPending: number;
    kycPending: number;
  };
  generatedAt?: any;
}

export interface PlatformActivityItem {
  id: string;
  type: "business_request" | "tenant_created";
  label: string;
  occurredAt: string;
}

export interface PlatformBuyerRequest {
  tenantId: string;
  requestId: string;
  status: "created" | "contacted" | "closed";
  citySlug: string;
  intent: "buy" | "rent" | "invest" | "lease" | "other";
  property?: {
    category?: string;
    type?: string;
    bhk?: number;
  };
  budget?: {
    currency?: string;
    min?: number;
    max?: number;
  };
  localityText?: string;
  mustHaves?: string[];
  dealBreakers?: string[];
  buyer?: {
    name?: string;
    phone?: string;
    preferredCallTime?: string;
  };
  partner?: { id?: string; name?: string };
  notes?: string;
  assignedTenantId?: string | null;
  convertedLeadId?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface PlatformTenantCreateResponse {
  tenantId: string;
  admin: {
    mode: "invite" | "direct";
    inviteId?: string | null;
    inviteToken?: string | null;
    uid?: string | null;
  };
}

export interface PlatformTenantDetail {
  tenantId: string;
  name: string;
  city?: string | null;
  type?: string | null;
  status: "active" | "suspended" | "closed" | string;
  planId?: string | null;
  planKey?: "trial" | "starter" | "growth" | "premium" | null;
  billing?: {
    billingCycle?: "monthly" | "yearly" | string | null;
    lastPaidThrough?: string | null;
    nextDueDate?: string | null;
  };
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  onboarding?: {
    adminUserExists?: boolean;
    inviteId?: string | null;
    inviteEmail?: string | null;
    inviteStatus?: string | null;
  };
  usage?: {
    projects?: number | null;
    listings?: number | null;
    users?: number | null;
  };
  createdAt?: string | null;
}

export interface PlatformTenantPayment {
  id: string;
  amount: number;
  mode: "NEFT" | "RTGS" | "IMPS" | "Cheque" | string;
  reference: string;
  txnDate?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  billingCycle?: "monthly" | "yearly" | string | null;
  status: "submitted" | "verified" | "rejected" | string;
  notes?: string | null;
  rejectionReason?: string | null;
  createdBy?: { uid?: string; email?: string | null } | null;
  createdAt?: string | null;
  verifiedBy?: { uid?: string; email?: string | null } | null;
  verifiedAt?: string | null;
}

export interface RegenerateTenantAdminInviteResponse {
  inviteId: string;
  inviteToken: string;
  email: string;
}


export interface DocumentLockerRecord {
  id: string;
  tenantId: string;
  entityType: "tenant" | "property" | "project" | "project_unit";
  entityId: string;
  category: string;
  title: string;
  description?: string;
  objectPath: string;
  contentType: string;
  sizeBytes: number;
  originalFileName?: string;
  visibility: "private" | "team" | "customer_shareable";
  status: "active" | "pending_verification" | "expired" | "replaced" | "archived";
  issueDate?: string;
  expiryDate?: string;
  replacedByDocumentId?: string | null;
  version?: number;
  tags?: string[];
  notes?: string;
  uploadedBy?: {
    uid: string;
    email?: string;
    name?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
