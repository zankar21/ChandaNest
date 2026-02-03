import { Request, Response } from "express";
import admin from "firebase-admin";
import { env } from "../../config/env";
import { firestore } from "../../config/firebase";

export async function expireTrialsHandler(req: Request, res: Response) {
  const key = req.header("x-cron-key") || "";
  if (!env.cronKey) {
    return res.status(500).json({ ok: false, error: { message: "CRON_KEY not configured", code: "CONFIG" } });
  }
  if (key !== env.cronKey) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }

  const now = admin.firestore.Timestamp.now();
  const query = firestore
    .collection("brokerProfiles")
    .where("status", "==", "trial_active")
    .where("trialEndAt", "<", now);
  const snap = await query.get();
  let expiredCount = 0;
  let batch = firestore.batch();
  let ops = 0;

  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "trial_expired",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    expiredCount += 1;
    ops += 1;
    if (ops >= 400) {
      batch.commit();
      batch = firestore.batch();
      ops = 0;
    }
  });

  if (ops > 0) {
    await batch.commit();
  }

  return res.json({ ok: true, data: { expiredCount } });
}
