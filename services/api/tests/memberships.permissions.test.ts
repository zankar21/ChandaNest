import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "../src/modules/memberships/permissions";
import { isActiveMembership } from "../src/modules/memberships/membership.middleware";

test("agency_admin has members.manage, agency_agent does not", () => {
  assert.equal(hasPermission("agency_admin", "members.manage"), true);
  assert.equal(hasPermission("agency_agent", "members.manage"), false);
});

test("isActiveMembership rejects suspended", () => {
  assert.equal(isActiveMembership({ status: "active" }), true);
  assert.equal(isActiveMembership({ status: "suspended" }), false);
});
