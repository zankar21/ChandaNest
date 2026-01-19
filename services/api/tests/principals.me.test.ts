import assert from "node:assert/strict";
import test from "node:test";
import type { AuthUser } from "../src/types";
import { getMyPrincipals } from "../src/modules/principals/principals.service";

test("getMyPrincipals returns owner when no memberships or agents", async () => {
  const user: AuthUser = {
    uid: "user-1",
    email: "owner@example.com",
    tenantId: "tenant-1",
    role: "owner"
  };
  const result = await getMyPrincipals(
    { tenantId: "tenant-1", user },
    {
      fetchMemberships: async () => [],
      fetchAgent: async () => null,
      fetchOrgLabel: async () => null
    }
  );
  assert.equal(result.ok, true);
  assert.equal(result.tenantId, "tenant-1");
  assert.equal(result.principals.length, 1);
  assert.equal(result.principals[0].type, "owner");
  assert.equal(result.principals[0].id, "user-1");
});

test("getMyPrincipals includes agency and enterprise memberships", async () => {
  const user: AuthUser = {
    uid: "user-2",
    email: "agent@example.com",
    tenantId: "tenant-1",
    role: "agency_admin"
  };
  const result = await getMyPrincipals(
    { tenantId: "tenant-1", user },
    {
      fetchMemberships: async () => [
        {
          tenantId: "tenant-1",
          userId: "user-2",
          orgType: "agency",
          orgId: "agency-1",
          role: "agency_admin",
          status: "active"
        },
        {
          tenantId: "tenant-1",
          userId: "user-2",
          orgType: "enterprise",
          orgId: "enterprise-1",
          role: "enterprise_admin",
          status: "active"
        }
      ],
      fetchAgent: async () => null,
      fetchOrgLabel: async () => null
    }
  );
  const types = result.principals.map((principal) => principal.type);
  assert.ok(types.includes("owner"));
  assert.ok(types.includes("agency"));
  assert.ok(types.includes("enterprise"));
});
