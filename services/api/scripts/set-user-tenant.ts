import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const uid = process.argv[2];
const tenantId = process.argv[3] || "public";
const role = process.argv[4] || "platform_admin";

if (!uid) {
  console.error("Usage: ts-node scripts/set-user-tenant.ts <uid> [tenantId] [role]");
  process.exit(1);
}

async function main() {
  await admin.firestore().collection("users").doc(uid).set(
    { tenantId, role },
    { merge: true }
  );
  console.log("OK set user", { uid, tenantId, role });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
