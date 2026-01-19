import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "../src/modules/memberships/permissions";

test("enterprise_project_manager can manage projects, non-member cannot", () => {
  assert.equal(hasPermission("enterprise_project_manager", "enterprise.projects.manage"), true);
  assert.equal(hasPermission(undefined, "enterprise.projects.manage"), false);
});
