import { expect, test } from "@playwright/test";

const apiBaseURL = "http://127.0.0.1:18000";

test("shows current conditions, visualizations and history table", async ({ page, request }) => {
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

  await expect(page.getByRole("heading", { name: "气象分析面板" })).toBeVisible();
  const current = page.getByRole("region", { name: "当前观测" });
  await expect(current).toContainText("23.4");
  await expect(current).toContainText("56.7");
  await expect(page.getByRole("img", { name: /^温湿指数/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "温湿度趋势图" })).toBeVisible();
  await expect(page.getByRole("img", { name: /温度日历热力图/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "温度按小时分布箱线图" })).toBeVisible();
  await expect(page.getByRole("img", { name: "温湿度舒适度分布图" })).toBeVisible();

  const records = page.getByRole("table", { name: "最近测量记录" });
  await expect(records).toBeVisible();
  await expect(records.getByRole("row")).toHaveCount(4);

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
  await page.getByRole("textbox", { name: "站点" }).fill(station);
  await page.getByRole("button", { name: "应用", exact: true }).click();

  await expect(page.getByRole("cell", { name: "19.2" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`station=${station}`));
});

test("optional sensors unlock air quality and wind visualizations", async ({ page, request }) => {
  const station = `e2e-sensors-${Date.now()}`;
  const observedAt = new Date().toISOString();

  const samples = [
    { wind_speed: 2.4, wind_direction: 20, co2: 680, pm25: 22, pm10: 40 },
    { wind_speed: 3.1, wind_direction: 95, co2: 720, pm25: 30, pm10: 55 },
    { wind_speed: 4.6, wind_direction: 210, co2: 760, pm25: 38, pm10: 70 },
  ];

  for (const [index, sample] of samples.entries()) {
    const response = await request.post(`${apiBaseURL}/api/v1/measurements`, {
      data: {
        station_id: station,
        observed_at: new Date(Date.parse(observedAt) - index * 60_000).toISOString(),
        temperature: 24 - index,
        humidity: 52 + index,
        ...sample,
      },
    });
    expect(response.status()).toBe(201);
  }

  await page.goto(`/?station=${station}`);

  const trendTabs = page.getByRole("tablist", { name: "趋势指标" });
  await trendTabs.getByRole("tab", { name: "空气质量" }).click();
  await expect(page.getByRole("img", { name: "空气质量趋势图" })).toBeVisible();
  await expect(page.getByRole("img", { name: /风玫瑰图/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /空气质量指数/ })).toBeVisible();

  const heatmapTabs = page.getByRole("tablist", { name: "热力图指标" });
  await heatmapTabs.getByRole("tab", { name: "湿度" }).click();
  await expect(page.getByRole("img", { name: /湿度日历热力图/ })).toBeVisible();
});

test("station map accepts coordinates from the URL", async ({ page }) => {
  await page.route("https://www.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/?station=station-01&lat=31.2304&lon=121.4737");

  await expect(page.getByText("31.2304, 121.4737")).toBeVisible();
  const map = page.getByTitle("站点 station-01 位置地图");
  await expect(map).toBeVisible();
  await expect(map).toHaveAttribute("src", /marker=31\.2304,121\.4737/);
});

test("empty station shows an empty state", async ({ page }) => {
  await page.goto(`/?station=e2e-empty-${Date.now()}`);
  await expect(page.getByText("暂无历史数据")).toBeVisible();
  await expect(page.getByText("暂无数据")).toBeVisible();
});
