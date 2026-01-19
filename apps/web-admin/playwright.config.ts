import { defineConfig } from "@playwright/test";
import path from "node:path";

const ADMIN_URL = process.env.PW_ADMIN_BASE_URL || "http://127.0.0.1:5174";
const PUBLIC_URL = process.env.PW_PUBLIC_BASE_URL || "http://127.0.0.1:5175";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  globalSetup: "./tests/e2e/globalSetup",
  use: {
    baseURL: ADMIN_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174",
      cwd: process.cwd(),
      url: ADMIN_URL,
      reuseExistingServer: true
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5175",
      cwd: path.resolve(process.cwd(), "../web-public"),
      url: PUBLIC_URL,
      reuseExistingServer: true
    }
  ],
  projects: [
    {
      name: "admin",
      use: {
        storageState:
          process.env.PW_SKIP_GLOBAL_SETUP === "1"
            ? undefined
            : process.env.PW_STORAGE_ADMIN || undefined
      }
    },
    {
      name: "user",
      use: {
        storageState: process.env.PW_STORAGE_USER || undefined
      }
    }
  ]
});
