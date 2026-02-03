import "./config/firebase";
import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";

const port = env.port;

const razorpayMissing: string[] = [];
if (!env.razorpayKeyId) razorpayMissing.push("RAZORPAY_KEY_ID");
if (!env.razorpayKeySecret) razorpayMissing.push("RAZORPAY_KEY_SECRET");
if (!env.razorpayPlanAgentMonthly) razorpayMissing.push("RAZORPAY_PLAN_AGENT_MONTHLY");
if (!env.razorpayPlanProfessionalMonthly) razorpayMissing.push("RAZORPAY_PLAN_PROFESSIONAL_MONTHLY");
const isLiveKey = env.razorpayKeyId.startsWith("rzp_live_");

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
  logger.info("Razorpay billing status", {
    billingProvider: env.billingProvider,
    razorpayConfigured: razorpayMissing.length === 0,
    missing: razorpayMissing
  });
  if (isLiveKey && env.nodeEnv !== "production") {
    logger.warn("LIVE Razorpay key detected in non-production environment");
  }
});
