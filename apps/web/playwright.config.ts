import { defineConfig } from "@playwright/test";

const apiPort = 18000;
const apiBaseURL = `http://127.0.0.1:${apiPort}`;
const databaseURL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://weather:weather@127.0.0.1:5433/weather_test";

const childEnv: Record<string, string> = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "go -C ../api run ./cmd/api",
      url: `${apiBaseURL}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...childEnv,
        PORT: String(apiPort),
        DATABASE_URL: databaseURL,
        CORS_ORIGINS: "http://127.0.0.1:4173",
      },
    },
    {
      command: "pnpm preview --port 4173 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...childEnv,
        VITE_API_TARGET: apiBaseURL,
      },
    },
  ],
});
