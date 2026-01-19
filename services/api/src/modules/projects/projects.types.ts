export type ProjectVisibility = {
  state: "draft" | "published";
  publishedAt?: FirebaseFirestore.Timestamp;
};

export type ProjectCounts = {
  totalUnits?: number;
  availableUnits?: number;
};

export type ProjectDoc = {
  id: string;
  tenantId: string;
  enterpriseId?: string;
  name: string;
  slug: string;
  type: "apartment" | "plot" | "commercial" | "mixed";
  status: "planning" | "under_construction" | "ready";
  rera?: { number?: string; authority?: string };
  location: { city: string; area?: string; addressLine?: string; lat?: number; lng?: number };
  priceRange?: { min?: number; max?: number; currency?: "INR" };
  possessionDate?: string;
  amenities?: string[];
  highlights?: string[];
  media?: {
    cover?: { objectPath: string };
    gallery?: { objectPath: string }[];
    brochure?: { objectPath: string };
  };
  visibility: ProjectVisibility;
  moderation?: { verificationStatus?: "pending" | "approved" | "rejected"; reason?: string };
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
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  availability: "available" | "blocked" | "sold";
  media?: { floorPlan?: { objectPath: string } };
  createdAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.FieldValue | FirebaseFirestore.Timestamp;
};

export type PublicProjectDoc = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  type: ProjectDoc["type"];
  status: ProjectDoc["status"];
  location: ProjectDoc["location"];
  priceRange?: ProjectDoc["priceRange"];
  possessionDate?: ProjectDoc["possessionDate"];
  amenities?: string[];
  highlights?: string[];
  media?: ProjectDoc["media"];
  visibility: ProjectVisibility;
  counts?: ProjectCounts;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
};

export type PublicUnitDoc = {
  id: string;
  projectId: string;
  unitId: string;
  tenantId: string;
  type: string;
  areaSqFt?: number;
  carpetSqFt?: number;
  builtUpSqFt?: number;
  price?: number;
  floor?: number;
  facing?: string;
  availability: "available" | "blocked" | "sold";
  media?: { floorPlan?: { objectPath: string } };
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
};
