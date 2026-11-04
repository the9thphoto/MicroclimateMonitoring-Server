import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

const apiBaseURL = "http://127.0.0.1:18000";

const MAP_STYLE = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#071318" },
    },
  ],
};

async function mockMap(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/styles/dark")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MAP_STYLE),
      });
      return;
    }
    await route.abort();
  });
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
}

async function setLocations(
  page: Page,
  locations: Record<string, { latitude: number; longitude: number }>,
) {
  await page.addInitScript((entries) => {
    for (const [station, location] of Object.entries(entries)) {
      localStorage.setItem(`microclimate.location.${station}`, JSON.stringify(location));
    }
  }, locations);
}

async function seedStation(request: APIRequestContext, station: string, count = 4) {
  const now = Date.now();
  for (let index = 0; index < count; index += 1) {
    const response = await request.post(`${apiBaseURL}/api/v1/measurements`, {
      data: {
        station_id: station,
        observed_at: new Date(now - index * 60_000).toISOString(),
        temperature: 23.4 - index * 0.4,
        humidity: 56.7 - index * 0.5,
        wind_speed: 2.4 + index * 0.2,
        wind_direction: 90 + index * 15,
        co2: 680 + index * 10,
        pm25: 22 + index,
        pm10: 40 + index,
      },
    });
    expect(response.status()).toBe(201);
  }
}

test("map workspace switches stations, layers and analysis views", async ({ page, request }) => {
  await mockMap(page);
  const suffix = Date.now();
  const main = `e2e-map-${suffix}`;
  const north = `e2e-north-${suffix}`;
  const east = `e2e-east-${suffix}`;
  await setLocations(page, {
    [main]: { latitude: 31.2304, longitude: 121.4737 },
    [north]: { latitude: 31.26, longitude: 121.45 },
    [east]: { latitude: 31.22, longitude: 121.51 },
  });
  await seedStation(request, main, 6);
  await seedStation(request, north, 3);
  await seedStation(request, east, 3);

  await page.goto(`/?station=${main}&view=map&layer=temperature&range=24h`);

  await expect(page.getByRole("heading", { name: "微气候观测地图" })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(`.station-marker[data-station="${main}"]`)).toBeVisible();
  await expect(page.locator(`.station-marker[data-station="${north}"]`)).toBeVisible();
  await expect(page.locator(`.station-marker[data-station="${east}"]`)).toBeVisible();

  await page.getByRole("button", { name: "湿度", exact: true }).click();
  await expect(page).toHaveURL(/layer=humidity/);
  await expect(page.locator(".topbar__status")).toContainText("相对湿度");

  await page.locator(`.station-marker[data-station="${main}"]`).click();
  await expect(page.locator(".station-panel")).toBeVisible();
  await expect(page.locator(".station-panel")).toContainText("次要要素");
  await expect(page.getByRole("button", { name: "关闭站点详情，返回总览地图" })).toBeVisible();
  await page.getByRole("button", { name: "关闭站点详情，返回总览地图" }).click();
  await expect(page.locator(".station-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "打开分析工作台" }).click();
  await expect(page.getByRole("heading", { name: "分析工作台" })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);
  await page.getByRole("tab", { name: "分时分布" }).click();
  await expect(page.locator(".box-plot")).toBeVisible();
  await page.getByRole("tab", { name: "要素相关" }).click();
  await expect(page.locator(".correlation__table")).toBeVisible();
  await page.getByRole("button", { name: "返回地图" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("timeline playback and scrubbing update the selected frame", async ({ page, request }) => {
  await mockMap(page);
  const station = `e2e-play-${Date.now()}`;
  await setLocations(page, {
    [station]: { latitude: 31.2304, longitude: 121.4737 },
  });
  await seedStation(request, station, 6);

  await page.goto(`/?station=${station}&view=map&range=24h`);
  const slider = page.getByRole("slider", { name: "回放时间" });
  await expect(slider).toBeVisible();
  const before = await slider.inputValue();

  await page.getByRole("button", { name: "播放回放" }).click();
  await expect(page.getByRole("button", { name: "暂停回放" })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(slider).not.toHaveValue(before);

  await page.getByRole("button", { name: "暂停回放" }).click();
  await slider.focus();
  await slider.press("Home");
  await expect(slider).toHaveValue("0");

  await page.getByRole("button", { name: "现在" }).click();
  await expect(slider).not.toHaveValue("0");
});

test("location dialog saves coordinates and reveals the station marker", async ({
  page,
  request,
}) => {
  await mockMap(page);
  const station = `e2e-locate-${Date.now()}`;
  await seedStation(request, station, 2);

  await page.goto(`/?station=${station}&view=map`);
  await expect(page.locator(".map-empty")).toBeVisible();
  await page.locator(".map-empty").getByRole("button", { name: "设置位置" }).click();

  await page.getByLabel("纬度").fill("31.2304");
  await page.getByLabel("经度").fill("121.4737");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByRole("status")).toContainText("已保存");
  await expect(page.locator(`.station-marker[data-station="${station}"]`)).toBeVisible();
  await expect(page).toHaveURL(/lat=31\.23040/);
});

test("mobile station view is a dedicated page without map overlays", async ({ page, request }) => {
  await mockMap(page);
  const station = `e2e-mobile-${Date.now()}`;
  await setLocations(page, {
    [station]: { latitude: 31.2304, longitude: 121.4737 },
  });
  await seedStation(request, station, 4);
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto(`/?station=${station}&view=station`);
  await expect(page.locator(".station-page")).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);
  await expect(page.locator(".layer-rail--horizontal")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "返回地图" }).first().click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("forecast layers stay disabled until a model provider is connected", async ({
  page,
  request,
}) => {
  await mockMap(page);
  const station = `e2e-forecast-${Date.now()}`;
  await setLocations(page, {
    [station]: { latitude: 31.2304, longitude: 121.4737 },
  });
  await seedStation(request, station, 2);

  await page.goto(`/?station=${station}&view=map`);
  await expect(page.getByRole("button", { name: "降水" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "云" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "气压" })).toBeDisabled();
});
