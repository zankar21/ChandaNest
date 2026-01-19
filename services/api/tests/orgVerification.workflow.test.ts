import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionUpdate, orgVerificationAccess } from "../src/modules/orgVerification/orgVerification.service";

const baseUser = {
  uid: "u1",
  email: "u1@example.com",
  tenantId: "t1",
  role: "member"
};

test("decide verified sets status and decidedBy", () => {
  const update = buildDecisionUpdate({
    status: "verified",
    userId: "u1",
    now: "now"
  });
  assert.equal(update.status, "verified");
  assert.equal(update.decidedBy.uid, "u1");
  assert.equal(update.decidedBy.at, "now");
});

test("agency_agent cannot decide verification", () => {
  const canDecide = orgVerificationAccess.canDecideVerification({
    user: baseUser as any,
    orgType: "agency",
    orgId: "agency1",
    memberships: [{ orgType: "agency", orgId: "agency1", role: "agency_agent", status: "active" }]
  });
  assert.equal(canDecide, false);
});
