import assert from "node:assert/strict";
import test from "node:test";
import { createPublicLead } from "../src/modules/leads/leads.service";

test("public lead for published org listing succeeds", async () => {
  const result = await createPublicLead(
    {
      body: {
        tenantId: "tenant-1",
        listingSource: "org",
        listingId: "listing-1",
        name: "Ravi",
        phone: "9999988888",
        email: "ravi@example.com",
        message: "Interested"
      }
    },
    {
      fetchOrgListing: async () => ({
        principalType: "agency",
        principalId: "agency-1",
        lifecycleState: "published",
        visibility: "public"
      }),
      fetchPublicProperty: async () => null,
      fetchOwnerListing: async () => null,
      createLeadDoc: async () => "lead-1"
    }
  );
  assert.equal(result.leadId, "lead-1");
});

test("public lead for unpublished org listing rejected", async () => {
  await assert.rejects(
    () =>
      createPublicLead(
        {
          body: {
            tenantId: "tenant-1",
            listingSource: "org",
            listingId: "listing-2",
            name: "Ravi",
            phone: "9999988888"
          }
        },
        {
          fetchOrgListing: async () => ({
            principalType: "agency",
            principalId: "agency-1",
            lifecycleState: "draft",
            visibility: "private"
          }),
          fetchPublicProperty: async () => null,
          fetchOwnerListing: async () => null,
          createLeadDoc: async () => "lead-2"
        }
      ),
    /Listing not available/
  );
});
