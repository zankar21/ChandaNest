import { expect, test } from "@playwright/test";
import { fillByPlaceholder, requireEnv, uniqueId } from "./_helpers";
import { loadRunState } from "./_state";

test.describe("Mandate required publish", () => {
  test("enforce mandate then publish", async ({ page }) => {
    requireEnv("PW_STORAGE_ADMIN");
    const ownerUid = process.env.PW_TEST_OWNER_UID;
    const ownerListingId = process.env.PW_TEST_OWNER_LISTING_ID;
    if (!ownerUid || !ownerListingId) {
      test.skip(true, "Missing PW_TEST_OWNER_UID or PW_TEST_OWNER_LISTING_ID.");
    }

    const runState = loadRunState();
    await page.goto("/org-listings");
    await expect(page.getByRole("heading", { name: /Org Listings/i })).toBeVisible();

    const principalSelect = page.locator("select").first();
    const principalValue = await principalSelect.inputValue();
    const [principalType, principalId] = principalValue.split(":");

    await fillByPlaceholder(page, /Listing title/i, uniqueId("MandateListing"));
    await fillByPlaceholder(page, /City/i, "Chandrapur");
    await page.getByRole("button", { name: /Create Listing/i }).click();

    if (runState.orgListingId) {
      await page.goto(`/org-listings/${runState.orgListingId}`);
    }

    const submitBtn = page.getByRole("button", { name: /Submit/i });
    if (await submitBtn.isVisible()) await submitBtn.click();
    const approveBtn = page.getByRole("button", { name: /Approve/i });
    if (await approveBtn.isVisible()) await approveBtn.click();

    const publishBtn = page.getByRole("button", { name: /Publish/i });
    if (await publishBtn.isVisible()) await publishBtn.click();
    await expect(page.getByText(/Mandate required/i)).toBeVisible();

    await fillByPlaceholder(page, /Owner UID/i, ownerUid);
    await fillByPlaceholder(page, /Owner Listing ID/i, ownerListingId);
    await page.getByRole("button", { name: /Save Owner Fields/i }).click();

    await page.getByRole("link", { name: /Open Mandates/i }).click();
    await expect(page.getByRole("heading", { name: /Mandates/i })).toBeVisible();

    await page.getByRole("combobox").first().selectOption(principalType);
    await fillByPlaceholder(page, /orgId/i, principalId);
    await fillByPlaceholder(page, /Owner UID/i, ownerUid);
    await fillByPlaceholder(page, /Owner Listing ID/i, ownerListingId);
    await page.getByRole("button", { name: /Request Mandate/i }).click();

    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();
    await expect(page.getByRole("heading", { name: /Mandate/i })).toBeVisible();

    const approveAction = page.getByRole("button", { name: /Approve/i });
    if (await approveAction.isVisible()) await approveAction.click();

    await page.goto("/org-listings");
    await page.locator("tbody tr").first().click();
    await page.getByRole("button", { name: /Publish/i }).click();
    await expect(page.getByText(/published/i)).toBeVisible();
  });
});
