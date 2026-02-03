"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.firestore = exports.firebaseApp = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./env");
const logger_1 = require("../utils/logger");
function maskPath(pathValue) {
    if (!pathValue)
        return "not-set";
    if (pathValue.length <= 8)
        return "***";
    return `${pathValue.slice(0, 4)}...${pathValue.slice(-4)}`;
}
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "";
if (env_1.env.nodeEnv === "development" && !credentialsPath && !firestoreEmulatorHost) {
    logger_1.logger.error("Missing GOOGLE_APPLICATION_CREDENTIALS for Firestore. Example PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS='D:\\ChandaNest\\secrets\\chandanest-dev-sa.json'");
}
logger_1.logger.info("Firebase config", {
    googleApplicationCredentials: maskPath(credentialsPath),
    firestoreEmulatorHost: firestoreEmulatorHost ? "set" : "not-set",
    projectId: env_1.env.projectId
});
let credential = firebase_admin_1.default.credential.applicationDefault();
if (credentialsPath) {
    try {
        const raw = fs_1.default.readFileSync(credentialsPath, "utf8");
        const serviceAccount = JSON.parse(raw);
        credential = firebase_admin_1.default.credential.cert(serviceAccount);
    }
    catch (err) {
        logger_1.logger.error("Failed to read GOOGLE_APPLICATION_CREDENTIALS", err);
    }
}
const firebaseApp = firebase_admin_1.default.apps.length
    ? firebase_admin_1.default.app()
    : firebase_admin_1.default.initializeApp({
        credential,
        storageBucket: env_1.env.firebaseStorageBucket,
        projectId: env_1.env.projectId
    });
exports.firebaseApp = firebaseApp;
const firestore = firebase_admin_1.default.firestore();
exports.firestore = firestore;
const storage = firebase_admin_1.default.storage().bucket();
exports.storage = storage;
logger_1.logger.info("Firebase initialized", { projectId: env_1.env.projectId });
logger_1.logger.info("Firestore client initialized", {
    source: "firebase-admin",
    singleInstanceEnforced: true
});
