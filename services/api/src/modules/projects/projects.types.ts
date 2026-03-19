export type ProjectVisibility = {
  state: "draft" | "published";
  publishedAt?: FirebaseFirestore.Timestamp;
};

export type ProjectCounts = {
  totalUnits?: number;
  availableUnits?: number;
};

export type ProjectMediaAsset = {
  objectPath: string;
  url?: string;
  contentType?: string;
};

export type ProjectDeveloper = {
  logo?: ProjectMediaAsset | null;
  experienceYears?: number;
  completedProjectsCount?: number;
  ongoingProjectsCount?: number;
};

export type ProjectSalesStatus = {
  preLaunch?: boolean;
  bookingOpen?: boolean;
  constructionLinkedPlan?: boolean;
  subventionPlan?: boolean;
};

export type ProjectFlags = {
  featured?: boolean;
  verified?: boolean;
  exclusivePartner?: boolean;
  premiumPosition?: number;
};

export type ProjectSeo = {
  title?: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
};

export type ProjectDoc = {
  id: string;
  tenantId: string;
  enterpriseId?: string;
  developerName?: string;
  developer?: ProjectDeveloper;
  name: string;
  slug: string;
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
  status?: "planning" | "under_construction" | "ready" | "layout_approved" | "na_approved" | "ready_for_sale";
  lifecycleStatus?: "planning" | "under_construction" | "ready" | "layout_approved" | "na_approved" | "ready_for_sale";
  recordStatus?: "active" | "inactive";
  possessionStatus?: "ready" | "under_construction";
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
  inventory?: {
    totalUnits?: number;
    availableUnits?: number;
    towers?: number;
    floors?: number;
    parking?: string;
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
    frontageFt?: number;
    depthFt?: number;
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
    titleClear?: boolean;
    litigation?: boolean;
    approvedBanks?: string[];
    possessionTimeline?: "ready" | "6_months" | "12_months" | "18_months" | "2_years" | "3_years";
    possessionTimelineNote?: string;
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
  salesStatus?: ProjectSalesStatus;
  flags?: ProjectFlags;
  seo?: ProjectSeo;
  mixedIncludes?: {
    residential?: boolean;
    commercial?: boolean;
    plotted?: boolean;
  };
  mixedUseIncludes?: {
    residential?: boolean;
    commercial?: boolean;
    plotted?: boolean;
  };
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
  location: {
    city: string;
    cityNormalized?: string;
    citySlug?: string;
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
    cover?: { objectPath: string } | null;
    gallery?: { objectPath: string }[];
    brochure?: { objectPath: string } | null;
  };
  visibility: ProjectVisibility;
  moderation?: { verificationStatus?: "pending" | "approved" | "rejected"; reason?: string };
  monetization?: {
    projectSpotlightActive?: boolean;
    projectSpotlightEndsAt?: string | null;
    rankWeight?: number;
    updatedAt?: string;
  };
  counts?: ProjectCounts;
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  createdBy?: { uid: string; role?: string };
  updatedBy?: { uid: string; role?: string };
};

export type UnitDoc = {
  id: string;
  projectId: string;
  tenantId: string;
  type: string;
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
  privateOpenSpaceSqFt?: number;
  cornerUnit?: boolean;
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
  mixedMeta?: {
    projectKind: "township" | "mixed_building";
    phase?: string;
    sector?: string;
    buildingName?: string;
    useZone?: "residential" | "commercial" | "plotted";
    block?: string;
  };
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
  availability: "available" | "blocked" | "sold";
  media?: { floorPlan?: { objectPath: string } };
  monetization?: {
    effectiveBoostTier?: "none" | "boost";
    boostEndsAt?: string | null;
    rankWeight?: number;
    updatedAt?: string;
  };
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type PublicProjectDoc = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  category?: ProjectDoc["category"];
  type: ProjectDoc["type"];
  status: NonNullable<ProjectDoc["lifecycleStatus"]>;
  lifecycleStatus?: ProjectDoc["lifecycleStatus"];
  recordStatus?: ProjectDoc["recordStatus"];
  developerName?: ProjectDoc["developerName"];
  developer?: ProjectDoc["developer"];
  possessionStatus?: ProjectDoc["possessionStatus"];
  rera?: ProjectDoc["rera"];
  approvals?: ProjectDoc["approvals"];
  launchDate?: ProjectDoc["launchDate"];
  completionDate?: ProjectDoc["completionDate"];
  totalUnitsPlanned?: ProjectDoc["totalUnitsPlanned"];
  configurationMix?: ProjectDoc["configurationMix"];
  commercialMix?: ProjectDoc["commercialMix"];
  plotDetails?: ProjectDoc["plotDetails"];
  commercialDetails?: ProjectDoc["commercialDetails"];
  salesStatus?: ProjectDoc["salesStatus"];
  flags?: Pick<NonNullable<ProjectDoc["flags"]>, "featured" | "verified">;
  mixedIncludes?: ProjectDoc["mixedIncludes"];
  mixedUseIncludes?: ProjectDoc["mixedUseIncludes"];
  mixedDetails?: ProjectDoc["mixedDetails"];
  location: ProjectDoc["location"];
  priceRange?: ProjectDoc["priceRange"];
  possessionDate?: ProjectDoc["possessionDate"];
  seo?: ProjectDoc["seo"];
  amenities?: string[];
  highlights?: string[];
  media?: ProjectDoc["media"];
  visibility: ProjectVisibility;
  counts?: ProjectCounts;
  monetization?: ProjectDoc["monetization"];
  city?: string;
  citySlug?: string;
  area?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  startingPrice?: number | null;
  availableUnits?: number | null;
  totalUnits?: number | null;
  bhkTypes?: number[];
  coverObjectPath?: string | null;
  coverUrl?: string | null;
  updatedAtMs?: number | null;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
};

export type PublicUnitDoc = {
  id: string;
  projectId: string;
  unitId: string;
  tenantId: string;
  projectSlug?: string;
  city?: string;
  citySlug?: string;
  type: string;
  bhk?: number | null;
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  plotLengthFeet?: number;
  plotWidthFeet?: number;
  plotAreaSqFt?: number;
  revenue?: UnitDoc["revenue"];
  roadWidthFeet?: number;
  corner?: boolean;
  cornerPremiumPct?: number;
  finalPrice?: number;
  privateOpenSpaceSqFt?: number;
  cornerUnit?: boolean;
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
  mixedMeta?: UnitDoc["mixedMeta"];
  area?: UnitDoc["area"];
  pricing?: UnitDoc["pricing"];
  floorInfo?: UnitDoc["floorInfo"];
  priceNumber?: number | null;
  areaSqFtNumber?: number | null;
  availability: "available" | "blocked" | "sold";
  media?: { floorPlan?: { objectPath: string } };
  monetization?: UnitDoc["monetization"];
  updatedAtMs?: number | null;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
};
