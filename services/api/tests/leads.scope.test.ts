import assert from "node:assert/strict";
import test from "node:test";
import { canAccessLead } from "../src/modules/leads/leads.service";

test("non-member cannot read agency lead", () => {
  const allowed = canAccessLead({
    user: { uid: "user-1", email: "", tenantId: "t1", role: "user" },
    lead: { principalType: "agency", principalId: "agency-1" },
    memberships: [],
    permission: "leads.read"
  });
  assert.equal(allowed, false);
});

test("agency member can read agency lead", () => {
  const allowed = canAccessLead({
    user: { uid: "user-2", email: "", tenantId: "t1", role: "agency_admin" },
    lead: { principalType: "agency", principalId: "agency-1" },
    memberships: [{ orgType: "agency", orgId: "agency-1", role: "agency_admin" }],
    permission: "leads.read"
  });
  assert.equal(allowed, true);
});
