import admin from "firebase-admin";

const DEFAULT_PARTNER = "Chandrapur Real Estate Solutions Pvt Ltd";

function initFirebase() {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function migrateTenantProjects(firestore, tenantId) {
  const snap = await firestore.collection("tenants").doc(tenantId).collection("projects").get();
  console.log(`Migrating ${snap.size} projects for tenant ${tenantId}`);
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const updates = {};
    if (!data.projectType) updates.projectType = "plotted";
    if (!data.status) updates.status = "launching";
    if (!data.brokeragePartnerId) updates.brokeragePartnerId = DEFAULT_PARTNER;

    const loc = data.location || {};
    const locationUpdates = {};
    if (!loc.citySlug && (loc.city || loc.cityName)) locationUpdates.citySlug = loc.city || loc.cityName;
    if (!loc.locality && (loc.area || loc.localityName)) locationUpdates.locality = loc.area || loc.localityName;
    if (!loc.state) locationUpdates.state = "Maharashtra";
    if (Object.keys(locationUpdates).length) {
      updates.location = { ...loc, ...locationUpdates };
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.set(updates, { merge: true });
      console.log(`Updated project ${doc.id}`, updates);
    }
  }
}

async function main() {
  const tenantIds = process.argv.slice(2);
  if (tenantIds.length === 0) {
    console.error("Usage: node scripts/migrate-projects-to-v2.mjs <tenantId> [tenantId...]");
    process.exit(1);
  }
  initFirebase();
  const firestore = admin.firestore();

  for (const tenantId of tenantIds) {
    await migrateTenantProjects(firestore, tenantId);
  }
  console.log("Migration complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
