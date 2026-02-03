import { Router } from "express";
import { razorpayWebhookHandler } from "./razorpay.controller";

export const razorpayWebhookRouter = Router();

razorpayWebhookRouter.post("/webhooks/razorpay", razorpayWebhookHandler);
razorpayWebhookRouter.post("/billing/razorpay/webhook", razorpayWebhookHandler);
