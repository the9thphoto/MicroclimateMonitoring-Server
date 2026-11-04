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

function defaultCoordinates(station: string): { latitude: number; longitude: number } {
  let hash = 0;
  for (const character of station) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return {
    latitude: 32.0839 + ((hash % 17) - 8) * 0.0015,
    longitude: 118.6361 + (((hash >>> 8) % 17) - 8) * 0.0015,
  };
}

async function seedStation(
  request: APIRequestContext,
  station: string,
  count = 4,
  latitude?: number,
  longitude?: number,
) {
  const fallback = defaultCoordinates(station);
  const lat = latitude ?? fallback.latitude;
  const lon = longitude ?? fallback.longitude;
  const now = Date.now();
  for (let index = 0; index < count; index += 1) {
    const response = await request.post(`${apiBaseURL}/api/v1/measurements`, {
      data: {
        station_id: station,
        latitude: lat,
        longitude: lon,
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

test("network map shows all reported stations and switches layers without selection", async ({
  page,
  request,
}) => {
  await mockMap(page);
  const suffix = Date.now();
  const main = `e2e-network-${suffix}`;
  const north = `e2e-north-${suffix}`;
  const east = `e2e-east-${suffix}`;
  await seedStation(request, main, 6, 32.0839, 118.6361);
  await seedStation(request, north, 3, 32.086, 118.633);
  await seedStation(request, east, 3, 32.081, 118.641);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "微气候观测地图" })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".station-panel")).toHaveCount(0);
  await expect(page.getByText("点击站点查看时间序列")).toBeVisible();
  await expect(page.locator(`.station-marker[data-station="${main}"]`)).toBeVisible();
  await expect(page.locator(`.station-marker[data-station="${north}"]`)).toBeVisible();
  await expect(page.locator(`.station-marker[data-station="${east}"]`)).toBeVisible();
  expect(
    await page
      .locator(`.station-marker[data-station="${main}"]`)
      .evaluate((element) => getComputedStyle(element).position),
  ).toBe("absolute");

  const temperature = page.getByRole("button", { name: "温度", exact: true });
  const humidity = page.getByRole("button", { name: "湿度", exact: true });
  await expect(temperature).toBeEnabled();
  await expect(humidity).toBeEnabled();
  await humidity.click();
  await expect(page).toHaveURL(/layer=humidity/);
  await expect(page).not.toHaveURL(/station=/);

  await page.locator(`.station-marker[data-station="${main}"]`).click({ force: true });
  await expect(page.locator(".station-panel")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`station=${main}`));
  await expect(page.getByRole("button", { name: "关闭站点详情，返回总览地图" })).toBeVisible();
  await page.getByRole("button", { name: "关闭站点详情，返回总览地图" }).click();
  await expect(page.locator(".station-panel")).toHaveCount(0);
  await expect(page).not.toHaveURL(/station=/);
  await expect(page.getByText("点击站点查看时间序列")).toBeVisible();
});

test("timeline playback and scrubbing update the selected station frame", async ({
  page,
  request,
}) => {
  await mockMap(page);
  const station = `e2e-play-${Date.now()}`;
  await seedStation(request, station, 6);

  await page.goto(`/?station=${station}&view=station&range=24h`);
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

test("station detail opens analysis and returns to the network map", async ({ page, request }) => {
  await mockMap(page);
  const station = `e2e-analysis-${Date.now()}`;
  await seedStation(request, station, 4);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "打开分析工作台" })).toBeDisabled();
  await page.locator(`.station-marker[data-station="${station}"]`).click({ force: true });
  await expect(page.locator(".station-panel")).toBeVisible();

  await page.getByRole("button", { name: "打开分析工作台" }).click();
  await expect(page.getByRole("heading", { name: "分析工作台" })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);
  await page.getByRole("tab", { name: "分时分布" }).click();
  await expect(page.locator(".box-plot")).toBeVisible();
  await page.getByRole("tab", { name: "要素相关" }).click();
  await expect(page.locator(".correlation__table")).toBeVisible();
  await page.getByRole("button", { name: "返回地图" }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".station-panel")).toHaveCount(0);
});

test("mobile station view is a dedicated page without map overlays", async ({ page, request }) => {
  await mockMap(page);
  const station = `e2e-mobile-${Date.now()}`;
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
  await expect(page.locator(".network-dock")).toBeVisible();
});

test("forecast layers stay disabled until a model provider is connected", async ({
  page,
  request,
}) => {
  await mockMap(page);
  const station = `e2e-forecast-${Date.now()}`;
  await seedStation(request, station, 2);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "降水" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "云" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "气压" })).toBeDisabled();
});

test("dense station networks use compact clickable markers", async ({ page, request }) => {
  await mockMap(page);
  const suffix = Date.now();
  for (let index = 0; index < 20; index += 1) {
    const latitude = 32.01 + (index % 5) * 0.02;
    const longitude = 118.56 + Math.floor(index / 5) * 0.02;
    await seedStation(request, `e2e-dense-${suffix}-${index}`, 1, latitude, longitude);
  }

  await page.goto("/");
  await expect(page.locator(".station-marker").first()).toBeVisible();
  const dense = page.locator(".station-marker.is-dense").first();
  await expect(dense).toBeVisible();

  await expect(page.locator(".map-view.has-field")).toBeVisible();
  await expect(page.getByText(/IDW 温度场/)).toBeVisible();
  await page.getByRole("button", { name: "温度场", exact: true }).click();
  await expect(page.locator(".map-view.has-field")).toHaveCount(0);
  await page.getByRole("button", { name: "显示温度场", exact: true }).click();
  await expect(page.locator(".map-view.has-field")).toBeVisible();

  await dense.click({ force: true });
  await expect(page.locator(".station-panel")).toBeVisible();
  const selected = page.locator(".station-marker.is-selected");
  await expect(selected).toHaveCount(1);
  expect(await selected.evaluate((element) => element.classList.contains("is-dense"))).toBe(false);
});
