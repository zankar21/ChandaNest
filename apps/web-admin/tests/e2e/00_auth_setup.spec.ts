import { test } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.use({ storageState: undefined });

test("create admin storageState", async ({ page, context }) => {
  await page.goto("/");
  await page.pause();
  await context.storageState({ path: ".auth/admin.json" });
});
