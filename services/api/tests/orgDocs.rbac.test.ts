import assert from "node:assert/strict";
import test from "node:test";
import { orgDocsAccess } from "../src/modules/orgDocs/orgDocs.service";

const baseUser = {
  uid: "u1",
  email: "u1@example.com",
  tenantId: "t1",
  role: "member"
};

test("orgDocs access rejects when user has no membership", () => {
  const canRead = orgDocsAccess.canAccessOrgDocs({
    user: baseUser as any,
    orgType: "agency",
    orgId: "agency1",
    memberships: [],
    permission: "orgDocs.read"
  });
  assert.equal(canRead, false);
});

test("agency_admin can manage orgDocs", () => {
  const canManage = orgDocsAccess.canAccessOrgDocs({
    user: baseUser as any,
    orgType: "agency",
    orgId: "agency1",
    memberships: [{ orgType: "agency", orgId: "agency1", role: "agency_admin", status: "active" }],
    permission: "orgDocs.manage"
  });
  assert.equal(canManage, true);
});
