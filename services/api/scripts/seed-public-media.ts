import "../src/config/firebase";
import admin from "firebase-admin";
import { env } from "../src/config/env";
import path from "path";
import fs from "fs";

async function upload(filePath: string, destination: string, contentType: string) {
  const storage = admin.storage().bucket();
  await storage.upload(filePath, {
    destination,
    metadata: {
      contentType
    }
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] uploaded ${destination}`);
}

async function main() {
  const tenantId = env.platformTenantId || "public";
  const baseDest = `tenants/${tenantId}/properties`;
  const assetsDir = path.resolve(__dirname, "assets");

  const propertyId = process.env.SEED_PROPERTY_ID;
  if (!propertyId) {
    // eslint-disable-next-line no-console
    console.error("Missing SEED_PROPERTY_ID env. Run seed-public to create one or set the id.");
    process.exit(1);
  }

  const heroSrc = path.join(assetsDir, "hero.png");
  const gallery1Src = path.join(assetsDir, "gallery-1.png");
  const gallery2Src = path.join(assetsDir, "gallery-2.png");
  [heroSrc, gallery1Src, gallery2Src].forEach((p) => {
    if (!fs.existsSync(p)) {
      // eslint-disable-next-line no-console
      console.error(`Missing asset file: ${p}`);
      process.exit(1);
    }
  });

  await upload(heroSrc, `${baseDest}/${propertyId}/media/hero.png`, "image/png");
  await upload(gallery1Src, `${baseDest}/${propertyId}/media/gallery-1.png`, "image/png");
  await upload(gallery2Src, `${baseDest}/${propertyId}/media/gallery-2.png`, "image/png");
  // eslint-disable-next-line no-console
  console.log("[seed] media upload complete");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
