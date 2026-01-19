#!/usr/bin/env node
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const uid = process.argv[2];
const role = process.argv[3] || "tenant_admin";
const tenantId = process.argv[4] || "powerpulsetech";

if (!uid) {
  console.error("Usage: node scripts/setClaims.mjs <uid> [role] [tenantId]");
  process.exit(1);
}

async function main() {
  await admin.auth().setCustomUserClaims(uid, { role, tenantId });
  console.log(`Claims set for ${uid}: role=${role}, tenantId=${tenantId}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Failed to set claims", err);
  process.exit(1);
});
