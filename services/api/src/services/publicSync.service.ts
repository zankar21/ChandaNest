import admin from "firebase-admin";
import { firestore } from "../config/firebase";
import { logger } from "../utils/logger";

function deepStripUndefined(value: any): any {
  if (value && typeof value === "object" && "_methodName" in value) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(deepStripUndefined).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      const cleaned = deepStripUndefined(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    });
    return Object.keys(result).length ? result : undefined;
  }
  return value === undefined ? undefined : value;
}

export async function upsertPublicProperty(propertyId: string, payload: any) {
  const cleanup = {
    galleryUrls: admin.firestore.FieldValue.delete(),
    heroUrl: admin.firestore.FieldValue.delete(),
    downloadToken: admin.firestore.FieldValue.delete()
  };
  const cleaned = deepStripUndefined(payload) || {};
  await firestore
    .collection("publicProperties")
    .doc(propertyId)
    .set({ ...cleanup, ...cleaned }, { merge: true });
  logger.info("Public property upserted", { propertyId, mediaCount: payload?.media?.gallery?.length ?? 0 });
}

export async function removePublicProperty(propertyId: string) {
  await firestore.collection("publicProperties").doc(propertyId).delete();
  logger.info("Public property removed", { propertyId });
}
