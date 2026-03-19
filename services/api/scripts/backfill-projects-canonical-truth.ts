import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";
import "../src/config/firebase";

type ReportItem = {
  id: string;
  tenantId: string;
  reason: string;
};

function parseArg(name: string, fallback = "") {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!raw) return fallback;
  return raw.split("=").slice(1).join("=") || fallback;
}

function parseBoolArg(name: string, fallback: boolean) {
  const raw = parseArg(name, fallback ? "1" : "0");
  return raw === "1" || raw.toLowerCase() === "true";
}

function resolveTenantId(doc: FirebaseFirestore.QueryDocumentSnapshot, data: Record<string, any>) {
  return data.tenantId || doc.ref.parent.parent?.id || "unknown";
}

async function run() {
  const tenantId = parseArg("tenant");
  const dryRun = parseBoolArg("dry", true);
  const outPath =
    parseArg("out") ||
    path.join(process.cwd(), "scripts", "assets", "projects-canonical-backfill-report.json");

  const firestore = admin.firestore();
  const report = {
    scanned: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    skippedItems: [] as ReportItem[],
    failures: [] as ReportItem[]
  };

  const snap = tenantId
    ? await firestore.collection("tenants").doc(tenantId).collection("projects").get()
    : await firestore.collectionGroup("projects").get();

  for (const doc of snap.docs) {
    report.scanned += 1;
    const data = (doc.data() || {}) as Record<string, any>;
    const resolvedTenantId = resolveTenantId(doc, data);

    try {
      const lifecycleStatus = data.lifecycleStatus ?? data.status;
      const totalUnitsPlanned = data.totalUnitsPlanned ?? data.inventory?.totalUnitsPlanned;
      const needsLifecycleBackfill = data.lifecycleStatus == null && lifecycleStatus != null;
      const hasLegacyStatus = data.status != null;
      const needsTotalUnitsBackfill = data.totalUnitsPlanned == null && totalUnitsPlanned != null;
      const hasLegacyInventoryUnits =
        data.inventory &&
        typeof data.inventory === "object" &&
        Object.prototype.hasOwnProperty.call(data.inventory, "totalUnitsPlanned");

      if (!needsLifecycleBackfill && !hasLegacyStatus && !needsTotalUnitsBackfill && !hasLegacyInventoryUnits) {
        report.skipped += 1;
        report.skippedItems.push({ id: doc.id, tenantId: resolvedTenantId, reason: "Already canonical" });
        continue;
      }

      const update: Record<string, unknown> = {};
      if (needsLifecycleBackfill) update.lifecycleStatus = lifecycleStatus;
      if (needsTotalUnitsBackfill) update.totalUnitsPlanned = totalUnitsPlanned;
      if (hasLegacyStatus) update.status = admin.firestore.FieldValue.delete();
      if (hasLegacyInventoryUnits) update["inventory.totalUnitsPlanned"] = admin.firestore.FieldValue.delete();

      if (!dryRun) {
        await doc.ref.update(update);
      }

      report.migrated += 1;
    } catch (error: any) {
      report.failed += 1;
      report.failures.push({
        id: doc.id,
        tenantId: resolvedTenantId,
        reason: error?.message || "Unknown error"
      });
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        tenantId: tenantId || "ALL",
        dryRun,
        report,
        outPath
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  void run().catch((err) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: err instanceof Error ? err.message : String(err)
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  });
}
