import { chromium, type FullConfig } from "@playwright/test";
import path from "node:path";
import { loadRunState, saveRunState } from "./_state";

const ADMIN_URL = process.env.PW_ADMIN_BASE_URL || "http://127.0.0.1:5174";

function idFromUrl(url: string) {
  const parts = url.split("/");
  return parts[parts.length - 1] || "";
}

async function createAgency(page: any) {
  await page.goto(`${ADMIN_URL}/agencies`);
  const createBtn = page.getByRole("button", { name: /Create Agency/i });
  if (!(await createBtn.isVisible())) return null;
  await createBtn.click();
  const name = `E2E Agency ${Date.now()}`;
  await page.getByPlaceholder(/Agency name/i).fill(name);
  await page.getByPlaceholder(/City/i).fill("Chandrapur");
  await page.getByRole("button", { name: /Save Agency/i }).click();
  await page.getByRole("heading", { name });
  return idFromUrl(page.url());
}

async function createEnterprise(page: any) {
  await page.goto(`${ADMIN_URL}/enterprises`);
  const createBtn = page.getByRole("button", { name: /Create Enterprise/i });
  if (!(await createBtn.isVisible())) return null;
  await createBtn.click();
  const name = `E2E Enterprise ${Date.now()}`;
  await page.getByPlaceholder(/Enterprise name/i).fill(name);
  await page.getByPlaceholder(/City/i).fill("Chandrapur");
  await page.getByRole("button", { name: /Save Enterprise/i }).click();
  await page.getByRole("heading", { name });
  return idFromUrl(page.url());
}

async function createProjectAndInventory(page: any, enterpriseId: string) {
  await page.goto(`${ADMIN_URL}/enterprises/${enterpriseId}/projects`);
  await page.getByPlaceholder(/Project name/i).fill(`E2E Project ${Date.now()}`);
  await page.getByPlaceholder(/City/i).fill("Chandrapur");
  await page.getByRole("button", { name: /Create Project/i }).click();
  const firstRow = page.locator("tbody tr").first();
  await firstRow.click();
  const projectId = idFromUrl(page.url());

  await page.locator("select").nth(2).selectOption("plot");
  await page.getByPlaceholder(/Code/i).fill(`PLOT-${Date.now()}`);
  await page.getByPlaceholder(/Area/i).fill("1200");
  await page.getByPlaceholder(/Total price/i).fill("2500000");
  await page.getByRole("button", { name: /Add Inventory/i }).click();
  return { projectId, itemId: undefined };
}

async function createOrgListing(page: any, agencyId?: string) {
  await page.goto(`${ADMIN_URL}/org-listings`);
  if (agencyId) {
    const select = page.locator("select").first();
    const optionValue = `agency:${agencyId}`;
    const hasOption = await select.locator(`option[value="${optionValue}"]`).count();
    if (hasOption > 0) {
      await select.selectOption(optionValue);
    }
  }
  await page.getByPlaceholder(/Listing title/i).fill(`E2E Listing ${Date.now()}`);
  await page.locator("select").nth(2).selectOption("Land");
  await page.locator("select").nth(3).selectOption("sale");
  await page.getByPlaceholder(/City/i).fill("Chandrapur");
  await page.getByRole("button", { name: /Create Listing/i }).click();
  return idFromUrl(page.url());
}

async function discoverPublicPropertyId(page: any) {
  await page.goto(`${ADMIN_URL}/listings`);
  const firstRow = page.locator("tbody tr").first();
  if (!(await firstRow.count())) return null;
  const editLink = firstRow.locator('a[href^="/listings/"]').first();
  if (!(await editLink.count())) return null;
  const href = await editLink.getAttribute("href");
  if (!href) return null;
  const parts = href.split("/");
  return parts[2] || null;
}

export default async function globalSetup(_config: FullConfig) {
  if (process.env.PW_SKIP_GLOBAL_SETUP === "1") return;
  const rawStorage = process.env.PW_STORAGE_ADMIN || ".auth/admin.json";
  const storage = path.isAbsolute(rawStorage) ? rawStorage : path.resolve(process.cwd(), rawStorage);
  if (!storage) return;

  const browser = await chromium.launch();
  let context;
  try {
    context = await browser.newContext({ storageState: storage });
  } catch (err: any) {
    console.error(`Failed to load storageState at ${storage}.`);
    await browser.close();
    throw err;
  }
  const page = await context.newPage();

  const state = loadRunState();

  if (!state.agencyId) {
    state.agencyId = await createAgency(page);
  }
  if (!state.enterpriseId) {
    state.enterpriseId = await createEnterprise(page);
  }
  if (state.enterpriseId && !state.projectId) {
    const data = await createProjectAndInventory(page, state.enterpriseId);
    state.projectId = data.projectId;
    state.itemId = data.itemId;
  }
  if (!state.orgListingId) {
    state.orgListingId = await createOrgListing(page, state.agencyId);
  }
  if (!state.publicPropertyId) {
    state.publicPropertyId = await discoverPublicPropertyId(page);
  }

  saveRunState(state);
  await context.close();
  await browser.close();
}
