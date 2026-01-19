// Usage:
// node scripts/deleteLegacyListings.mjs --tenant=powerpulsetech --dry=1
// node scripts/deleteLegacyListings.mjs --tenant=powerpulsetech --dry=0 --limit=200

import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
require("ts-node/register/transpile-only");
require("../src/config/firebase");

const { DEFAULTS } = require("../src/constants/propertyEnums.ts");

function parseArg(name, fallback) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return fallback;
  return raw.split("=").slice(1).join("=") || fallback;
}

function isMissing(value) {
  return value === undefined || value === null || value === "";
}

function collectMediaPaths(data) {
  const paths = [];
  if (data?.media?.hero?.objectPath) paths.push(data.media.hero.objectPath);
  if (Array.isArray(data?.media?.gallery)) {
    data.media.gallery.forEach((item) => {
      if (item?.objectPath) paths.push(item.objectPath);
    });
  }
  if (Array.isArray(data?.media?.documents)) {
    data.media.documents.forEach((item) => {
      if (item?.objectPath) paths.push(item.objectPath);
    });
  }
  return paths;
}

const tenantId = parseArg("tenant", "powerpulsetech");
const dryRun = parseArg("dry", "1") !== "0";
const limitRaw = parseArg("limit", "");
const limit = limitRaw ? Number(limitRaw) : 0;
const maxCandidates = Number.isFinite(limit) && limit > 0 ? limit : Infinity;

const firestore = admin.firestore();

async function run() {
  const ref = firestore.collection("tenants").doc(tenantId).collection("listings");
  const snap = await ref.get();

  let scanned = 0;
  let candidates = 0;
  let deleted = 0;
  let skipped = 0;
  let publicDeleted = 0;
  let errors = 0;
  let batch = firestore.batch();
  let batchOps = 0;

  for (const doc of snap.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const reasons = [];

    if (isMissing(data.title) || String(data.title).trim().length < 3) {
      reasons.push("missing/short title");
    }
    if (isMissing(data.type)) reasons.push("missing type");
    if (isMissing(data.propertyType)) reasons.push("missing propertyType");
    if (isMissing(data.brokeragePartnerId)) {
      reasons.push("missing brokeragePartnerId");
    } else if (data.brokeragePartnerId !== DEFAULTS.brokeragePartnerId) {
      reasons.push("brokeragePartnerId mismatch");
    }
    if (isMissing(data.createdAt)) reasons.push("missing createdAt");
    if (!data.createdBy || typeof data.createdBy !== "object") reasons.push("missing createdBy");
    if (!data.moderation || typeof data.moderation !== "object") reasons.push("missing moderation");
    if (isMissing(data.listingStatus)) reasons.push("missing listingStatus");

    if (reasons.length === 0) {
      skipped += 1;
      continue;
    }

    candidates += 1;
    console.log(`[candidate] ${doc.id} - ${reasons.join(", ")}`);

    const mediaPaths = collectMediaPaths(data);
    if (mediaPaths.length > 0) {
      console.log(`  media: ${mediaPaths.join(", ")}`);
    } else {
      console.log("  media: none");
    }

    if (candidates >= maxCandidates) {
      console.log(`Limit reached (${maxCandidates}). Stopping scan.`);
    }

    let hasPublic = false;
    try {
      const publicSnap = await firestore.collection("publicProperties").doc(doc.id).get();
      hasPublic = publicSnap.exists;
    } catch (err) {
      errors += 1;
      console.error(`Failed to check public doc for ${doc.id}`, err);
    }

    if (!dryRun) {
      try {
        const neededOps = 1 + (hasPublic ? 1 : 0);
        if (batchOps + neededOps > 400) {
          await batch.commit();
          batch = firestore.batch();
          batchOps = 0;
        }

        batch.delete(doc.ref);
        batchOps += 1;
        deleted += 1;

        if (hasPublic) {
          batch.delete(firestore.collection("publicProperties").doc(doc.id));
          batchOps += 1;
          publicDeleted += 1;
        }
      } catch (err) {
        errors += 1;
        console.error(`Failed to delete ${doc.id}`, err);
      }
    }

    if (candidates >= maxCandidates) {
      break;
    }
  }

  if (!dryRun && batchOps > 0) {
    try {
      await batch.commit();
    } catch (err) {
      errors += 1;
      console.error("Final batch commit failed", err);
    }
  }

  console.log("Summary", {
    tenantId,
    scanned,
    candidates,
    deleted,
    skipped,
    publicDeleted,
    errors,
    dryRun
  });
}

run().catch((err) => {
  console.error("Cleanup failed", err);
  process.exit(1);
});
