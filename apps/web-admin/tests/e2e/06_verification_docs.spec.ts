import { expect, test } from "@playwright/test";
import { fillByPlaceholder, requireEnv } from "./_helpers";
import { loadRunState } from "./_state";

test.describe("Verification docs", () => {
  test("register doc metadata and verify", async ({ page }) => {
    requireEnv("PW_STORAGE_ADMIN");
    const runState = loadRunState();
    const orgType = process.env.PW_TEST_VERIFY_ORG_TYPE || (runState.enterpriseId ? "enterprise" : "agency");
    const orgId = process.env.PW_TEST_VERIFY_ORG_ID || runState.enterpriseId || runState.agencyId;
    if (!orgType || !orgId) {
      test.skip(true, "Missing PW_TEST_VERIFY_ORG_TYPE or PW_TEST_VERIFY_ORG_ID.");
    }

    await page.goto(`/org-verification/${orgType}/${orgId}`);
    await expect(page.getByRole("heading", { name: /Verification/i })).toBeVisible();

    await page.locator("select").first().selectOption("pan");
    await fillByPlaceholder(page, /Title/i, "PAN");
    await fillByPlaceholder(page, /Object path/i, `tenants/powerpulsetech/org-docs/${orgId}/pan-test.pdf`);
    await page.getByRole("button", { name: /Register Document/i }).click();
    await expect(page.getByText("pan")).toBeVisible();

    await page.locator("select").nth(1).selectOption("verified");
    await fillByPlaceholder(page, /Notes/i, "Verified");
    await page.getByRole("button", { name: /Save Decision/i }).click();
    await expect(page.getByText(/verified/i)).toBeVisible();
  });
});
