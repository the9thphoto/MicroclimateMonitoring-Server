import { expect, test } from "@playwright/test";

const apiBaseURL = "http://127.0.0.1:18000";

test("shows latest values, chart and history table", async ({ page, request }) => {
  const station = `e2e-${Date.now()}`;
  const observedAt = new Date().toISOString();

  for (let index = 0; index < 3; index += 1) {
    const response = await request.post(`${apiBaseURL}/api/v1/measurements`, {
      data: {
        station_id: station,
        observed_at: new Date(Date.parse(observedAt) - index * 60_000).toISOString(),
        temperature: 23.4 - index,
        humidity: 56.7 - index,
      },
    });
    expect(response.status()).toBe(201);
  }

  await page.goto(`/?station=${station}`);

  await expect(page.getByRole("heading", { name: "校园微气候监测" })).toBeVisible();
  await expect(page.locator(".kpi-card").filter({ hasText: "温度" })).toContainText("23.4");
  await expect(page.locator(".kpi-card").filter({ hasText: "湿度" })).toContainText("56.7");
  await expect(page.getByRole("application")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(4);

  await page.getByRole("tab", { name: "1 小时" }).click();
  await expect(page.getByRole("tab", { name: "1 小时" })).toHaveAttribute("aria-selected", "true");
});

test("station form switches the dashboard", async ({ page, request }) => {
  const station = `e2e-form-${Date.now()}`;
  const response = await request.post(`${apiBaseURL}/api/v1/measurements`, {
    data: {
      station_id: station,
      temperature: 19.2,
      humidity: 44.5,
    },
  });
  expect(response.status()).toBe(201);

  await page.goto("/?station=station-01");
  await page.getByLabel("站点").fill(station);
  await page.getByRole("button", { name: "应用" }).click();

  await expect(page.getByRole("cell", { name: "19.2" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`station=${station}`));
});

test("empty station shows an empty state", async ({ page }) => {
  await page.goto(`/?station=e2e-empty-${Date.now()}`);
  await expect(page.getByText("暂无历史数据")).toBeVisible();
  await expect(page.getByText("暂无数据")).toBeVisible();
});
