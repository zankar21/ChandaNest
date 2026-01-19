import "../src/config/firebase"; // initializes firebase-admin
import admin from "firebase-admin";
import { env } from "../src/config/env";

// Seed a published public property with sample media paths.
async function main() {
  // eslint-disable-next-line no-console
  console.log("[seed] firebase initialized");
  const firestore = admin.firestore();
  const tenantId = env.platformTenantId || "public";
  const propertyRef = firestore.collection("tenants").doc(tenantId).collection("properties").doc();
  const propertyId = propertyRef.id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const media = {
    hero: { objectPath: `tenants/${tenantId}/properties/${propertyId}/media/hero.png`, contentType: "image/png" },
    gallery: [
      { objectPath: `tenants/${tenantId}/properties/${propertyId}/media/gallery-1.png`, contentType: "image/png" },
      { objectPath: `tenants/${tenantId}/properties/${propertyId}/media/gallery-2.png`, contentType: "image/png" }
    ]
  };

  const doc = {
    meta: {
      tenantId,
      propertyId,
      projectId: null,
      source: "owner",
      createdBy: { uid: "seed-user", email: "seed@example.com" },
      createdAt: now,
      updatedAt: now
    },
    listing: {
      title: "Seeded Public Property",
      description: "Sample property seeded for development.",
      purpose: "sale",
      category: "land",
      type: "plot",
      status: "available",
      visibility: "published",
      featured: true,
      tags: ["seed", "demo"]
    },
    location: {
      countryCode: "IN",
      state: "MH",
      city: "Pune",
      locality: "Kothrud",
      addressLine: "123 Demo Street",
      postalCode: "411038"
    },
    pricing: {
      currency: "INR",
      amount: 10000000,
      negotiable: true
    },
    area: {
      unit: "sqft",
      builtUp: 1200,
      plot: 1500
    },
    details: {},
    amenities: ["water", "electricity"],
    media,
    contact: {
      displayName: "Seed User",
      phone: "+91-9000000000",
      email: "seed@example.com",
      showOnPublic: true
    },
    localIdentifiers: {
      IN: {
        revenue: {
          surveyNo: "123/1",
          gatNo: "45",
          mouza: "Demo",
          warg: "A",
          taluka: "Pune",
          district: "Pune",
          ctsNo: "CTS123",
          khataNo: "KH123"
        }
      }
    },
    moderation: {
      verificationStatus: "approved",
      requiredAction: "none",
      approvedBy: "seed-user",
      approvedAt: now,
      remarks: "Seed approved"
    }
  };

  await propertyRef.set(doc, { merge: true });

  const publicPayload = {
    propertyId,
    tenantId,
    projectId: null,
    title: doc.listing.title,
    purpose: doc.listing.purpose,
    category: doc.listing.category,
    type: doc.listing.type,
    status: doc.listing.status,
    currency: doc.pricing.currency,
    amount: doc.pricing.amount,
    areaUnit: doc.area?.unit ?? null,
    areaBuiltUp: doc.area?.builtUp ?? null,
    areaPlot: doc.area?.plot ?? null,
    countryCode: doc.location.countryCode,
    state: doc.location.state,
    city: doc.location.city,
    locality: doc.location.locality,
    geo: doc.location.geo ?? null,
    heroObjectPath: media.hero?.objectPath ?? null,
    featured: doc.listing.featured ?? false,
    isPublished: true,
    updatedAt: now,
    media
  };

  await firestore.collection("publicProperties").doc(propertyId).set(publicPayload, { merge: true });
  // eslint-disable-next-line no-console
  console.log(`Seeded public property: ${propertyId}`);
}

// eslint-disable-next-line no-console
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
