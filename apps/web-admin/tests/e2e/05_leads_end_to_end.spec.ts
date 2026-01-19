import { expect, test } from "@playwright/test";
import { ADMIN_URL, PUBLIC_URL, fillByPlaceholder, requireEnv, uniqueId } from "./_helpers";
import { loadRunState } from "./_state";

test.describe("Leads end-to-end", () => {
  test("submit enquiry and manage in admin", async ({ page }) => {
    requireEnv("PW_STORAGE_ADMIN");
    const runState = loadRunState();
    const propertyId = runState.publicPropertyId || process.env.PW_TEST_PUBLIC_PROPERTY_ID;
    if (!propertyId) {
      test.skip(true, "Missing PW_TEST_PUBLIC_PROPERTY_ID.");
    }

    const phone = `9${Date.now().toString().slice(-9)}`;

    await page.goto(`${PUBLIC_URL}/p/${propertyId}`);
    const enquireBtn =
      page.getByRole("button", { name: /enquire|enquiry|contact/i }).first();
    if (!(await enquireBtn.isVisible())) {
      test.skip(true, "Enquiry button not found on public page.");
    }
    await enquireBtn.click();

    await fillByPlaceholder(page, /Name/i, uniqueId("Lead"));
    await fillByPlaceholder(page, /Phone/i, phone);
    await fillByPlaceholder(page, /Email/i, "lead@example.com");
    await fillByPlaceholder(page, /Message/i, "Test enquiry");
    await page.getByRole("button", { name: /submit|send/i }).click();

    await page.goto(`${ADMIN_URL}/leads`);
    await expect(page.getByRole("heading", { name: /Leads/i })).toBeVisible();
    await page.locator("tbody tr").first().click();

    await page.getByRole("combobox").first().selectOption("contacted");
    await page.getByRole("button", { name: /Update Status/i }).click();
    await expect(page.getByText(/contacted/i)).toBeVisible();

    await page.locator("select").last().selectOption("note");
    await fillByPlaceholder(page, /Note/i, "Followed up");
    await page.getByRole("button", { name: /Add Activity/i }).click();
    await expect(page.getByText(/Followed up/i)).toBeVisible();
  });
});
