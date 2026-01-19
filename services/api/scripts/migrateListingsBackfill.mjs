// Usage:
// node scripts/migrateListingsBackfill.mjs --tenant=powerpulsetech
// node scripts/migrateListingsBackfill.mjs --tenant=powerpulsetech --dry=1

import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("ts-node/register/transpile-only");
require("../src/config/firebase");

const { DEFAULTS, LISTING_DEAL_TYPE, PROPERTY_TYPE } = require("../src/constants/propertyEnums.ts");

function parseArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return fallback;
  return raw.split("=").slice(1).join("=") || fallback;
}

const tenantId = parseArg("tenant", "powerpulsetech");
const dryRun = parseArg("dry", "0") === "1";

const firestore = admin.firestore();

function isMissing(value) {
  return value === undefined || value === null || value === "";
}

async function run() {
  const ref = firestore.collection("tenants").doc(tenantId).collection("listings");
  const snap = await ref.get();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let batch = firestore.batch();
  let batchOps = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const updates = {};

    if (isMissing(data.visibility)) updates.visibility = "draft";
    if (isMissing(data.listingStatus)) updates.listingStatus = "draft";
    if (!data.moderation || typeof data.moderation !== "object") {
      updates.moderation = {
        verificationStatus: "draft",
        requiredAction: "none",
        approvedBy: null,
        approvedAt: null,
        remarks: null
      };
    }
    if (!data.createdBy || typeof data.createdBy !== "object") {
      const uid = data.ownerUid || data.createdByUid || "unknown";
      updates.createdBy = { uid, email: "" };
    }
    if (isMissing(data.createdAt)) updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
    if (isMissing(data.updatedAt)) updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    if (isMissing(data.brokeragePartnerId)) updates.brokeragePartnerId = DEFAULTS.brokeragePartnerId;
    if (isMissing(data.title)) updates.title = "Untitled listing";
    if (isMissing(data.type)) updates.type = LISTING_DEAL_TYPE.includes("sale") ? "sale" : LISTING_DEAL_TYPE[0];
    if (isMissing(data.propertyType))
      updates.propertyType = PROPERTY_TYPE.includes("land") ? "land" : PROPERTY_TYPE[0];

    const location = data.location || null;
    const legacyLat = location?.lat;
    const legacyLng = location?.lng;
    const geoLat = location?.geo?.lat;
    const geoLng = location?.geo?.lng;
    if (typeof legacyLat === "number" && typeof legacyLng === "number" && (geoLat === undefined || geoLng === undefined)) {
      updates["location.geo"] = { lat: legacyLat, lng: legacyLng };
      updates["location.lat"] = admin.firestore.FieldValue.delete();
      updates["location.lng"] = admin.firestore.FieldValue.delete();
    } else if (typeof legacyLat === "number" || typeof legacyLng === "number") {
      updates["location.lat"] = admin.firestore.FieldValue.delete();
      updates["location.lng"] = admin.firestore.FieldValue.delete();
    }

    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      updated += 1;
      console.log(`[dry-run] ${doc.id}`, updates);
      continue;
    }

    try {
      batch.update(doc.ref, updates);
      batchOps += 1;
      updated += 1;
      if (batchOps >= 400) {
        await batch.commit();
        batch = firestore.batch();
        batchOps = 0;
      }
    } catch (err) {
      errors += 1;
      console.error(`Failed to update ${doc.id}`, err);
    }
  }

  if (!dryRun && batchOps > 0) {
    await batch.commit();
  }

  console.log("Summary", { tenantId, scanned, updated, skipped, errors, dryRun });
}

run().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
