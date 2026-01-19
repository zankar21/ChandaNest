import fs from "node:fs";
import path from "node:path";

const API_BASE = process.env.API_BASE || "http://localhost:8080";
const TENANT_ID = process.env.TENANT_ID || "powerpulsetech";
const ID_TOKEN_A = process.env.ID_TOKEN_A;
const ID_TOKEN_B = process.env.ID_TOKEN_B;

if (!ID_TOKEN_A || !ID_TOKEN_B) {
  console.error("Missing ID_TOKEN_A or ID_TOKEN_B.");
  process.exit(1);
}

const DOC_PATH = path.resolve(process.cwd(), "../../docs/SANITY_PASS_PHASE8.md");

function decodeUid(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64").toString("utf8");
    const data = JSON.parse(json);
    return data.user_id || data.sub || data.uid || null;
  } catch {
    return null;
  }
}

function truncate(value, max = 500) {
  if (!value) return value;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

async function request({ name, method, url, token, body, expect }) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  const status = res.status;
  const pass = expect.includes(status);
  return {
    name,
    method,
    url,
    status,
    expect,
    pass,
    response: truncate(typeof json === "string" ? json : JSON.stringify(json))
  };
}

function formatResult(result) {
  const statusLine = `- ${result.name}: ${result.method} ${result.url}`;
  const expectLine = `  - Expected: ${result.expect.join("/")} | Actual: ${result.status} | ${result.pass ? "PASS" : "FAIL"}`;
  const responseLine = `  - Response: ${result.response || "-"}`;
  return [statusLine, expectLine, responseLine].join("\n");
}

async function run() {
  const uidA = decodeUid(ID_TOKEN_A);
  const uidB = decodeUid(ID_TOKEN_B);
  const now = new Date().toISOString();

  const results = [];

  results.push(
    await request({
      name: "principals.me (tenant_admin)",
      method: "GET",
      url: `${API_BASE}/v1/tenants/${TENANT_ID}/principals/me`,
      token: ID_TOKEN_A,
      expect: [200]
    })
  );

  results.push(
    await request({
      name: "principals.me (unauth)",
      method: "GET",
      url: `${API_BASE}/v1/tenants/${TENANT_ID}/principals/me`,
      token: null,
      expect: [401]
    })
  );

  const agencyCreate = await request({
    name: "create agency (tenant_admin)",
    method: "POST",
    url: `${API_BASE}/v1/tenants/${TENANT_ID}/agencies`,
    token: ID_TOKEN_A,
    body: { name: `Sanity Agency ${now}` },
    expect: [200, 201]
  });
  results.push(agencyCreate);
  const agencyId = agencyCreate.response?.includes("agencyId")
    ? JSON.parse(agencyCreate.response)?.data?.agencyId
    : null;

  results.push(
    await request({
      name: "create agency (non-admin)",
      method: "POST",
      url: `${API_BASE}/v1/tenants/${TENANT_ID}/agencies`,
      token: ID_TOKEN_B,
      body: { name: `Forbidden Agency ${now}` },
      expect: [403]
    })
  );

  results.push(
    await request({
      name: "list agencies",
      method: "GET",
      url: `${API_BASE}/v1/tenants/${TENANT_ID}/agencies`,
      token: ID_TOKEN_A,
      expect: [200]
    })
  );

  if (agencyId && uidB) {
    results.push(
      await request({
        name: "add agency member",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/agencies/${agencyId}/members`,
        token: ID_TOKEN_A,
        body: { userId: uidB, role: "agency_agent", status: "active" },
        expect: [200, 201]
      })
    );
  }

  const enterpriseCreate = await request({
    name: "create enterprise (tenant_admin)",
    method: "POST",
    url: `${API_BASE}/v1/tenants/${TENANT_ID}/enterprises`,
    token: ID_TOKEN_A,
    body: { name: `Sanity Enterprise ${now}` },
    expect: [200, 201]
  });
  results.push(enterpriseCreate);
  const enterpriseId = enterpriseCreate.response?.includes("enterpriseId")
    ? JSON.parse(enterpriseCreate.response)?.data?.enterpriseId
    : null;

  if (enterpriseId && uidB) {
    results.push(
      await request({
        name: "add enterprise member",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/enterprises/${enterpriseId}/members`,
        token: ID_TOKEN_A,
        body: { userId: uidB, role: "enterprise_project_manager", status: "active" },
        expect: [200, 201]
      })
    );
  }

  const listingCreate = uidA
    ? await request({
        name: "create org listing (agent)",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-listings`,
        token: ID_TOKEN_A,
        body: {
          principalType: "agent",
          principalId: uidA,
          title: `Sanity Listing ${now}`,
          propertyType: "Land",
          listingType: "sale",
          location: { city: "Chandrapur" }
        },
        expect: [200, 201]
      })
    : null;
  if (listingCreate) results.push(listingCreate);
  const listingId = listingCreate?.response?.includes("id")
    ? JSON.parse(listingCreate.response)?.data?.id
    : null;

  if (listingId) {
    results.push(
      await request({
        name: "org listing submit",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-listings/${listingId}/transition`,
        token: ID_TOKEN_A,
        body: { action: "submit" },
        expect: [200]
      })
    );
    results.push(
      await request({
        name: "org listing approve",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-listings/${listingId}/transition`,
        token: ID_TOKEN_A,
        body: { action: "approve" },
        expect: [200]
      })
    );
    results.push(
      await request({
        name: "org listing publish",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-listings/${listingId}/transition`,
        token: ID_TOKEN_A,
        body: { action: "publish" },
        expect: [200]
      })
    );
  }

  if (listingId) {
    results.push(
      await request({
        name: "public lead create",
        method: "POST",
        url: `${API_BASE}/v1/public/leads`,
        token: null,
        body: {
          tenantId: TENANT_ID,
          listingSource: "org",
          listingId,
          name: "Sanity Lead",
          phone: "9999999999"
        },
        expect: [200, 201]
      })
    );
  }

  const mandateRequest = uidA
    ? await request({
        name: "mandate request",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/mandates/request`,
        token: ID_TOKEN_A,
        body: {
          orgType: "agent",
          orgId: uidA,
          ownerUid: uidB || "ownerUid",
          ownerListingId: "ownerListingId",
          mandateType: "non_exclusive"
        },
        expect: [200, 201]
      })
    : null;
  if (mandateRequest) results.push(mandateRequest);
  const mandateId = mandateRequest?.response?.includes("mandateId")
    ? JSON.parse(mandateRequest.response)?.data?.mandateId
    : null;

  if (mandateId) {
    results.push(
      await request({
        name: "mandate approve",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/mandates/${mandateId}/approve`,
        token: ID_TOKEN_A,
        body: { validTo: "2026-01-01" },
        expect: [200]
      })
    );
  }

  if (agencyId) {
    results.push(
      await request({
        name: "org doc register",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-docs`,
        token: ID_TOKEN_A,
        body: {
          orgType: "agency",
          orgId: agencyId,
          category: "pan",
          objectPath: `tenants/${TENANT_ID}/org-docs/${agencyId}/pan.pdf`
        },
        expect: [200, 201]
      })
    );
    results.push(
      await request({
        name: "org verification get",
        method: "GET",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-verification/agency/${agencyId}`,
        token: ID_TOKEN_A,
        expect: [200]
      })
    );
    results.push(
      await request({
        name: "org verification decide",
        method: "POST",
        url: `${API_BASE}/v1/tenants/${TENANT_ID}/org-verification/agency/${agencyId}/decide`,
        token: ID_TOKEN_A,
        body: { status: "verified" },
        expect: [200]
      })
    );
  }

  const sectionLines = [
    "",
    "## Automated curl run",
    `- Timestamp: ${now}`,
    `- API_BASE: ${API_BASE}`,
    `- TENANT_ID: ${TENANT_ID}`,
    "",
    ...results.map(formatResult),
    ""
  ];

  fs.appendFileSync(DOC_PATH, sectionLines.join("\n"));
  console.log(`Phase 8 sanity run appended to ${DOC_PATH}`);
}

run().catch((err) => {
  console.error("Sanity run failed.", err.message);
  process.exit(1);
});
