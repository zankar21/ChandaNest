import admin from "firebase-admin";
import fs from "fs";
import { env } from "./env";
import { logger } from "../utils/logger";

function maskPath(pathValue: string) {
  if (!pathValue) return "not-set";
  if (pathValue.length <= 8) return "***";
  return `${pathValue.slice(0, 4)}...${pathValue.slice(-4)}`;
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "";

if (env.nodeEnv === "development" && !credentialsPath && !firestoreEmulatorHost) {
  logger.error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS for Firestore. Example PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS='D:\\ChandaNest\\secrets\\chandanest-dev-sa.json'"
  );
}

logger.info("Firebase config", {
  googleApplicationCredentials: maskPath(credentialsPath),
  firestoreEmulatorHost: firestoreEmulatorHost ? "set" : "not-set",
  projectId: env.projectId
});

let credential = admin.credential.applicationDefault();
if (credentialsPath) {
  try {
    const raw = fs.readFileSync(credentialsPath, "utf8");
    const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
    credential = admin.credential.cert(serviceAccount);
  } catch (err) {
    logger.error("Failed to read GOOGLE_APPLICATION_CREDENTIALS", err);
  }
}

const firebaseApp = admin.apps.length
  ? admin.app()
  : admin.initializeApp({
      credential,
      storageBucket: env.firebaseStorageBucket,
      projectId: env.projectId
    });

const firestore = admin.firestore();
const storage = admin.storage().bucket();

logger.info("Firebase initialized", { projectId: env.projectId });
logger.info("Firestore client initialized", {
  source: "firebase-admin",
  singleInstanceEnforced: true
});

export { firebaseApp, firestore, storage };
