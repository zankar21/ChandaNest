import crypto from "crypto";
import { Request, Response } from "express";
import admin from "firebase-admin";
import { env } from "../../config/env";
import { firestore } from "../../config/firebase";
import { logger } from "../../utils/logger";
import { resolveSubscriptionIndex, updateAgentSubscriptionFromWebhook } from "../agent/agent.subscription.service";

function getRawBody(req: Request): Buffer {
  const raw = (req as any).rawBody;
  if (Buffer.isBuffer(raw)) return raw;
  if (Buffer.isBuffer(req.body)) return req.body as Buffer;
  if (typeof req.body === "string") return Buffer.from(req.body);
  return Buffer.from(JSON.stringify(req.body || {}));
}

function verifySignature(rawBody: Buffer, signature: string, secret: string) {
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigBuf = Buffer.from(signature || "", "utf8");
  const digestBuf = Buffer.from(digest, "utf8");
  if (sigBuf.length !== digestBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, digestBuf);
}

export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature = req.header("x-razorpay-signature") || "";
  if (!signature) {
    return res.status(400).json({ ok: false, error: { message: "Missing signature", code: "BAD_REQUEST" } });
  }
  if (!env.razorpayWebhookSecret) {
    return res.status(500).json({ ok: false, error: { message: "Webhook secret not configured", code: "CONFIG" } });
  }

  const rawBody = getRawBody(req);
  const bodyText = rawBody.toString("utf8");
  const signatureVerified = verifySignature(rawBody, signature, env.razorpayWebhookSecret);
  if (!signatureVerified) {
    return res.status(400).json({ ok: false, error: { message: "Invalid signature", code: "INVALID_SIGNATURE" } });
  }

  let payload: any = null;
  try {
    payload = JSON.parse(bodyText);
  } catch (err) {
    logger.warn("Webhook payload parse failed", err);
    return res.status(400).json({ ok: false, error: { message: "Invalid JSON", code: "BAD_REQUEST" } });
  }

  const eventType = payload?.event || "unknown";
  const eventId = payload?.id || payload?.event_id || "";
  const eventKey = eventId ? `razorpay_${eventId}` : `razorpay_${crypto.createHash("sha256").update(bodyText).digest("hex")}`;
  const ref = firestore.collection("webhookEvents").doc(eventKey);
  const snap = await ref.get();
  if (snap.exists) {
    return res.json({ ok: true, data: { ignored: true } });
  }

  const subscriptionId = payload?.payload?.subscription?.entity?.id || null;
  const paymentId = payload?.payload?.payment?.entity?.id || null;
  const notes =
    payload?.payload?.subscription?.entity?.notes ||
    payload?.payload?.payment?.entity?.notes ||
    {};
  const uid = typeof notes?.uid === "string" ? notes.uid : undefined;
  const tenantId = typeof notes?.tenantId === "string" ? notes.tenantId : null;
  const planCode = typeof notes?.planCode === "string" ? notes.planCode : undefined;
  const billingIntentId = typeof notes?.billingIntentId === "string" ? notes.billingIntentId : undefined;

  logger.info("Razorpay webhook received", {
    eventType,
    subscriptionId,
    tenantId,
    uid,
    signatureVerified
  });

  if (!tenantId) {
    return res.status(400).json({ ok: false, error: { message: "Tenant missing in payload notes", code: "TENANT_MISSING" } });
  }

  await ref.set({
    provider: "razorpay",
    eventIdOrHash: eventId || eventKey.replace("razorpay_", ""),
    eventType,
    subscriptionId,
    paymentId,
    uid,
    tenantId,
    billingIntentId,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  logger.info("Razorpay webhook stored", { eventType, eventKey });
  if (subscriptionId) {
    let resolvedTenantId = tenantId;
    let resolvedUid = uid;
    let resolvedPlanCode = planCode;
    if (!resolvedUid) {
      const indexed = await resolveSubscriptionIndex(subscriptionId);
      resolvedUid = resolvedUid || indexed?.uid;
      resolvedPlanCode = resolvedPlanCode || indexed?.planCode;
    }
    if (resolvedTenantId && resolvedUid) {
      const subscriptionEntity = payload?.payload?.subscription?.entity || null;
      const currentPeriodEnd = subscriptionEntity?.current_end ?? null;
      await updateAgentSubscriptionFromWebhook({
        subscriptionId,
        tenantId: resolvedTenantId,
        uid: resolvedUid,
        planCode: resolvedPlanCode,
        status: subscriptionEntity?.status,
        paymentId,
        currentPeriodEnd,
        eventType
      });
    } else {
      logger.warn("Razorpay webhook missing tenant or uid", { subscriptionId, eventType });
    }
  }
  return res.json({ ok: true, data: { stored: true } });
}
