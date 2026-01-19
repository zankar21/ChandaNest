import { expect, test } from "@playwright/test";
import { fillByPlaceholder, requireEnv, uniqueId } from "./_helpers";

test.describe("Org Listings workflow", () => {
  test("create and transition listing", async ({ page }) => {
    requireEnv("PW_STORAGE_ADMIN");

    await page.goto("/org-listings");
    await expect(page.getByRole("heading", { name: /Org Listings/i })).toBeVisible();

    await fillByPlaceholder(page, /Listing title/i, uniqueId("OrgListing"));
    await page.locator("select").nth(2).selectOption("Land");
    await page.locator("select").nth(3).selectOption("sale");
    await fillByPlaceholder(page, /City/i, "Chandrapur");
    await page.getByRole("button", { name: /Create Listing/i }).click();

    await expect(page.getByRole("heading", { name: /Org Listing/i })).toBeVisible();

    const submitBtn = page.getByRole("button", { name: /Submit/i });
    if (await submitBtn.isVisible()) await submitBtn.click();
    await expect(page.getByText(/review/i)).toBeVisible();

    const approveBtn = page.getByRole("button", { name: /Approve/i });
    if (await approveBtn.isVisible()) await approveBtn.click();
    await expect(page.getByText(/approved/i)).toBeVisible();

    const publishBtn = page.getByRole("button", { name: /Publish/i });
    if (await publishBtn.isVisible()) await publishBtn.click();
    await expect(page.getByText(/published/i)).toBeVisible();

    const unpublishBtn = page.getByRole("button", { name: /Unpublish/i });
    if (await unpublishBtn.isVisible()) await unpublishBtn.click();
    await expect(page.getByText(/unpublished/i)).toBeVisible();

    const titleInput = page.getByPlaceholder("Title");
    await titleInput.fill(uniqueId("OrgListing-Edit"));
    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(page.getByRole("heading", { name: /Org Listing/i })).toBeVisible();

    const republishBtn = page.getByRole("button", { name: /Publish/i });
    if (await republishBtn.isVisible()) await republishBtn.click();
    await expect(page.getByText(/published/i)).toBeVisible();
  });
});
