import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  GCP_PROJECT_ID: z.string().min(1, "GCP_PROJECT_ID is required"),
  FIREBASE_STORAGE_BUCKET: z.string().min(1, "FIREBASE_STORAGE_BUCKET is required"),
  GOOGLE_APPLICATION_CREDENTIALS: z
    .string()
    .min(1, "GOOGLE_APPLICATION_CREDENTIALS is required"),
  APP_CHECK_STRICT: z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1"),
  ALLOW_APP_CHECK_OPTIONAL: z
    .string()
    .default("true")
    .transform((value) => value === "true" || value === "1"),
  PLATFORM_TENANT_ID: z.string().min(1).default("public"),
  PUBLIC_DEFAULT_TENANT_ID: z.string().default(""),
  PUBLIC_WEB_BASE_URL: z.string().default("https://www.chandanest.in"),
  CORS_ORIGINS: z.string().default(""),
  GOOGLE_PLACES_API_KEY: z.string().default(""),
  GOOGLE_MAPS_SERVER_KEY: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  AI_DESC_MAX_CHARS: z.coerce.number().int().positive().default(700),
  AI_DESC_MIN_CHARS: z.coerce.number().int().positive().default(350),
  PUBLIC_MARKETPLACE_TENANT_ID: z.string().default(""),
  PUBLIC_LEAD_TENANT_ALLOWLIST: z.string().default(""),
  LEADS_RATE_LIMIT_SALT: z.string().default(""),
  IP_HASH_SALT: z.string().default("local-dev-salt"),
  INVITE_TOKEN_SALT: z.string().default("local-dev-invite-salt"),
  PLATFORM_ADMIN_UIDS: z.string().default(""),
  BILLING_PROVIDER: z.enum(["manual", "razorpay", "stripe"]).default("manual"),
  TRIAL_DAYS: z.coerce.number().int().positive().default(14)
});

const parsed = EnvSchema.parse(process.env);

if (parsed.NODE_ENV === "production" && !parsed.LEADS_RATE_LIMIT_SALT) {
  throw new Error("LEADS_RATE_LIMIT_SALT is required in production");
}

export const env = {
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
  publicMarketplaceTenantId: parsed.PUBLIC_MARKETPLACE_TENANT_ID || "",
  publicLeadTenantAllowlist: parsed.PUBLIC_LEAD_TENANT_ALLOWLIST.split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  leadsRateLimitSalt: parsed.LEADS_RATE_LIMIT_SALT || "",
  ipHashSalt: parsed.IP_HASH_SALT,
  inviteTokenSalt: parsed.INVITE_TOKEN_SALT,
  platformAdminUids: parsed.PLATFORM_ADMIN_UIDS.split(",").map((uid) => uid.trim()).filter(Boolean),
  billingProvider: parsed.BILLING_PROVIDER,
  trialDays: parsed.TRIAL_DAYS
};

export type Env = typeof env;
