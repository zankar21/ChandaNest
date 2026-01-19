const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const TENANT_ID = process.env.TENANT_ID;
const JWT = process.env.JWT;
const APP_CHECK = process.env.APP_CHECK;

if (!TENANT_ID) {
  console.error("Missing TENANT_ID env var.");
  process.exit(1);
}

function decodeJwtUid(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
    return {
      uid: payload.user_id || payload.uid || payload.sub || null,
      name: payload.name || payload.email || null,
      role: payload.role || null
    };
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(JWT ? { Authorization: `Bearer ${JWT}` } : {}),
      ...(APP_CHECK ? { "X-Firebase-AppCheck": APP_CHECK } : {}),
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { status: res.status, json };
}

async function run() {
  console.log("[1/6] Create public lead");
  const publicPayload = {
    subject: {
      kind: "project",
      projectSlug: "smoke-project",
      title: "SMOKE lead",
      href: "https://www.chandanest.in/projects/smoke-project",
      city: "Chandrapur"
    },
    contact: {
      name: "Smoke Test",
      phone: "+919999999999",
      email: "smoke@example.com",
      message: "SMOKE lead"
    },
    source: { page: "home" }
  };
  const publicRes = await request("/v1/public/leads", {
    method: "POST",
    body: JSON.stringify(publicPayload)
  });
  if (![200, 204].includes(publicRes.status)) {
    console.error("Public lead failed:", publicRes.status, publicRes.json);
    return;
  }
  console.log("Public lead ok:", publicRes.status);

  if (!JWT) {
    console.log("[2/6] Skipping admin steps (missing JWT)");
    return;
  }

  console.log("[2/6] List admin leads");
  const listRes = await request(`/v1/admin/leads?tenantId=${encodeURIComponent(TENANT_ID)}&limit=10`, {
    method: "GET"
  });
  if (listRes.status !== 200) {
    console.error("List leads failed:", listRes.status, listRes.json);
    return;
  }
  const items = listRes.json?.data?.items || [];
  const match = items.find((item) => item?.subject?.title === "SMOKE lead");
  if (!match) {
    console.warn("No SMOKE lead found in latest list.");
    return;
  }
  const leadId = match.id;
  console.log("Found lead:", leadId);

  const assignee = decodeJwtUid(JWT);
  if (assignee?.uid) {
    console.log("[3/6] Assign lead");
    const assignRes = await request(`/v1/admin/leads/${leadId}/assign?tenantId=${encodeURIComponent(TENANT_ID)}`, {
      method: "POST",
      body: JSON.stringify({ uid: assignee.uid, name: assignee.name || undefined, role: assignee.role || undefined })
    });
    if (assignRes.status !== 200) {
      console.error("Assign failed:", assignRes.status, assignRes.json);
    } else {
      console.log("Assigned to:", assignee.uid);
    }
  } else {
    console.log("[3/6] Skipping assign (unable to infer uid from JWT)");
  }

  console.log("[4/6] Move stage to contacted");
  const stageRes = await request(`/v1/admin/leads/${leadId}/stage?tenantId=${encodeURIComponent(TENANT_ID)}`, {
    method: "POST",
    body: JSON.stringify({ stage: "contacted" })
  });
  if (stageRes.status !== 200) {
    console.error("Stage update failed:", stageRes.status, stageRes.json);
  } else {
    console.log("Stage updated.");
  }

  console.log("[5/6] Add note");
  const noteRes = await request(`/v1/admin/leads/${leadId}/notes?tenantId=${encodeURIComponent(TENANT_ID)}`, {
    method: "POST",
    body: JSON.stringify({ type: "note", text: "smoke note" })
  });
  if (noteRes.status !== 200) {
    console.error("Add note failed:", noteRes.status, noteRes.json);
  } else {
    console.log("Note added.");
  }

  console.log("[6/6] Fetch notes");
  const notesRes = await request(`/v1/admin/leads/${leadId}/notes?tenantId=${encodeURIComponent(TENANT_ID)}`, {
    method: "GET"
  });
  if (notesRes.status !== 200) {
    console.error("List notes failed:", notesRes.status, notesRes.json);
    return;
  }
  const notes = notesRes.json?.data?.items || [];
  const found = notes.some((note) => note?.text === "smoke note");
  console.log(found ? "Smoke note found." : "Smoke note missing.");
}

run().catch((err) => {
  console.error("Smoke failed:", err);
  process.exit(1);
});
