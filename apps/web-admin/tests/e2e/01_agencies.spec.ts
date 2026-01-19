import { expect, test } from "@playwright/test";
import { fillByPlaceholder, requireEnv, uniqueId } from "./_helpers";

test.describe("Agencies", () => {
  test("create agency and add member", async ({ page }) => {
    requireEnv("PW_STORAGE_ADMIN");

    await page.goto("/agencies");
    await expect(page.getByRole("heading", { name: /Agencies/i })).toBeVisible();

    const createBtn = page.getByRole("button", { name: /Create Agency/i });
    if (!(await createBtn.isVisible())) {
      test.skip(true, "Create Agency not visible (insufficient permissions).");
    }
    await createBtn.click();

    const name = uniqueId("Agency");
    await fillByPlaceholder(page, /Agency name/i, name);
    await fillByPlaceholder(page, /City/i, "Chandrapur");
    await fillByPlaceholder(page, /Email/i, "agency@example.com");
    await fillByPlaceholder(page, /Phone/i, "9999999999");

    await page.getByRole("button", { name: /Save Agency/i }).click();
    await expect(page.getByRole("heading", { name: name })).toBeVisible();

    await page.getByRole("link", { name: /Manage Members/i }).click();
    await expect(page.getByRole("heading", { name: /Agency Members/i })).toBeVisible();

    const memberUid = process.env.PW_TEST_USER_B_UID;
    if (!memberUid) {
      test.skip(true, "Missing PW_TEST_USER_B_UID; skipping add member.");
    }
    await fillByPlaceholder(page, /User ID/i, memberUid);
    await page.getByRole("button", { name: /Add Member/i }).click();
    await expect(page.getByText(memberUid)).toBeVisible();
  });
});
