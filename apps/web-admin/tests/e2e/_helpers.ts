import { test, type Page } from "@playwright/test";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    test.skip(true, `Missing ${name}`);
  }
  return value || "";
}

export function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export async function fillByPlaceholder(page: Page, placeholder: RegExp | string, value: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.fill(value);
}

export async function safeClickByText(page: Page, text: RegExp | string) {
  await page.getByRole("button", { name: text }).click();
}

export const ADMIN_URL = process.env.PW_ADMIN_BASE_URL ?? "http://127.0.0.1:5174";
export const PUBLIC_URL = process.env.PW_PUBLIC_BASE_URL ?? "http://127.0.0.1:5175";
