import { expect, test } from "@playwright/test";
import { fillByPlaceholder, requireEnv, uniqueId } from "./_helpers";

test.describe("Enterprises + Inventory", () => {
  test("create enterprise, project, inventory item, update status", async ({ page }) => {
    requireEnv("PW_STORAGE_ADMIN");

    await page.goto("/enterprises");
    await expect(page.getByRole("heading", { name: /Enterprises/i })).toBeVisible();

    const createBtn = page.getByRole("button", { name: /Create Enterprise/i });
    if (!(await createBtn.isVisible())) {
      test.skip(true, "Create Enterprise not visible (insufficient permissions).");
    }
    await createBtn.click();

    const name = uniqueId("Enterprise");
    await fillByPlaceholder(page, /Enterprise name/i, name);
    await fillByPlaceholder(page, /City/i, "Chandrapur");
    await page.getByRole("button", { name: /Save Enterprise/i }).click();
    await expect(page.getByRole("heading", { name: name })).toBeVisible();

    await page.getByRole("link", { name: /Projects & Inventory/i }).click();
    await expect(page.getByRole("heading", { name: /Projects/i })).toBeVisible();

    await fillByPlaceholder(page, /Project name/i, uniqueId("Project"));
    await fillByPlaceholder(page, /City/i, "Chandrapur");
    await page.getByRole("button", { name: /Create Project/i }).click();

    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();
    await expect(page.getByRole("heading", { name: /Project/i })).toBeVisible();

    await page.locator("select").nth(2).selectOption("plot");
    await fillByPlaceholder(page, /Code/i, uniqueId("PLOT"));
    await fillByPlaceholder(page, /Area/i, "1200");
    await fillByPlaceholder(page, /Total price/i, "2500000");
    await page.getByRole("button", { name: /Add Inventory/i }).click();

    const statusSelect = page.locator("tbody tr select").first();
    await statusSelect.selectOption("booked");
    await expect(page.getByText("booked")).toBeVisible();
  });
});
