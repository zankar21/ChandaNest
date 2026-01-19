#!/usr/bin/env node
import admin from "firebase-admin";
import fs from "node:fs";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credPath && !fs.existsSync(credPath)) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS file not found.");
  console.error(`Path: ${credPath}`);
  console.error("Download a service account key from Firebase Console and keep it outside the repo.");
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const USERS = [
  {
    email: "tenant_admin@test.com",
    password: "Test@2026",
    claims: { role: "tenant_admin", tenantId: "powerpulsetech" }
  },
  {
    email: "user@test.com",
    password: "Test@2026",
    claims: { tenantId: "powerpulsetech" }
  }
];

async function upsertUser({ email, password }) {
  try {
    const existing = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(existing.uid, { password, emailVerified: true });
    console.log(`OK created/updated ${email} uid=${existing.uid}`);
    return existing.uid;
  } catch (err) {
    if (err?.code !== "auth/user-not-found") {
      throw err;
    }
    const created = await admin.auth().createUser({ email, password, emailVerified: true });
    console.log(`OK created/updated ${email} uid=${created.uid}`);
    return created.uid;
  }
}

async function main() {
  for (const user of USERS) {
    const uid = await upsertUser(user);
    await admin.auth().setCustomUserClaims(uid, user.claims);
    console.log(`OK claims set ${user.email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to create/update test users", err);
    process.exit(1);
  });
