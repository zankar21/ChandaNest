"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    GCP_PROJECT_ID: zod_1.z.string().min(1, "GCP_PROJECT_ID is required"),
    FIREBASE_STORAGE_BUCKET: zod_1.z.string().min(1, "FIREBASE_STORAGE_BUCKET is required"),
    GOOGLE_APPLICATION_CREDENTIALS: zod_1.z
        .string()
        .min(1, "GOOGLE_APPLICATION_CREDENTIALS is required"),
    APP_CHECK_STRICT: zod_1.z
        .string()
        .default("false")
        .transform((value) => value === "true" || value === "1"),
    ALLOW_APP_CHECK_OPTIONAL: zod_1.z
        .string()
        .default("true")
        .transform((value) => value === "true" || value === "1"),
    PLATFORM_TENANT_ID: zod_1.z.string().min(1).default("public"),
    PUBLIC_DEFAULT_TENANT_ID: zod_1.z.string().default(""),
    PUBLIC_WEB_BASE_URL: zod_1.z.string().default("https://www.chandanest.in"),
    CORS_ORIGINS: zod_1.z.string().default(""),
    GOOGLE_PLACES_API_KEY: zod_1.z.string().default(""),
    GOOGLE_MAPS_SERVER_KEY: zod_1.z.string().default(""),
    GEMINI_API_KEY: zod_1.z.string().default(""),
    GEMINI_MODEL: zod_1.z.string().default("gemini-1.5-flash"),
    AI_DESC_MAX_CHARS: zod_1.z.coerce.number().int().positive().default(700),
    AI_DESC_MIN_CHARS: zod_1.z.coerce.number().int().positive().default(350),
    IP_HASH_SALT: zod_1.z.string().default("local-dev-salt"),
    INVITE_TOKEN_SALT: zod_1.z.string().default("local-dev-invite-salt"),
    PLATFORM_ADMIN_UIDS: zod_1.z.string().default(""),
    BILLING_PROVIDER: zod_1.z.enum(["manual", "razorpay", "stripe"]).default("manual"),
    TRIAL_DAYS: zod_1.z.coerce.number().int().positive().default(14)
});
const parsed = EnvSchema.parse(process.env);
exports.env = {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    projectId: parsed.GCP_PROJECT_ID,
    firebaseStorageBucket: parsed.FIREBASE_STORAGE_BUCKET,
    googleApplicationCredentials: parsed.GOOGLE_APPLICATION_CREDENTIALS,
    appCheckStrict: parsed.APP_CHECK_STRICT,
    allowAppCheckOptional: parsed.ALLOW_APP_CHECK_OPTIONAL,
    platformTenantId: parsed.PLATFORM_TENANT_ID,
    publicDefaultTenantId: parsed.PUBLIC_DEFAULT_TENANT_ID || "",
    publicWebBaseUrl: parsed.PUBLIC_WEB_BASE_URL || "https://www.chandanest.in",
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    googlePlacesApiKey: parsed.GOOGLE_PLACES_API_KEY,
    googleMapsServerKey: parsed.GOOGLE_MAPS_SERVER_KEY,
    geminiApiKey: parsed.GEMINI_API_KEY,
    geminiModel: parsed.GEMINI_MODEL,
    aiDescMaxChars: parsed.AI_DESC_MAX_CHARS,
    aiDescMinChars: parsed.AI_DESC_MIN_CHARS,
    ipHashSalt: parsed.IP_HASH_SALT,
    inviteTokenSalt: parsed.INVITE_TOKEN_SALT,
    platformAdminUids: parsed.PLATFORM_ADMIN_UIDS.split(",").map((uid) => uid.trim()).filter(Boolean),
    billingProvider: parsed.BILLING_PROVIDER,
    trialDays: parsed.TRIAL_DAYS
};
