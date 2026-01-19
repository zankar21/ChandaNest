import assert from "node:assert/strict";
import test from "node:test";
import { validateMandateForPublish } from "../src/modules/mandates/mandates.service";

test("publish without ownerListingId does not require mandate", async () => {
  const result = await validateMandateForPublish(
    {
      tenantId: "t1",
      principalType: "agency",
      principalId: "a1",
      ownerListingId: undefined
    },
    {
      findActive: async () => ({ id: "m1" } as any)
    }
  );
  assert.equal(result, null);
});

test("publish with ownerListingId but no active mandate is rejected", async () => {
  await assert.rejects(
    async () =>
      validateMandateForPublish(
        {
          tenantId: "t1",
          principalType: "agency",
          principalId: "a1",
          ownerUid: "owner1",
          ownerListingId: "p1"
        },
        {
          findActive: async () => null
        }
      ),
    (err: any) => err?.code === "MANDATE_REQUIRED"
  );
});

test("publish with active mandate passes and returns mandate", async () => {
  const result = await validateMandateForPublish(
    {
      tenantId: "t1",
      principalType: "agent",
      principalId: "agent1",
      ownerUid: "owner1",
      ownerListingId: "p1"
    },
    {
      findActive: async () => ({ id: "m42", status: "active" } as any)
    }
  );
  assert.equal(result?.id, "m42");
});
