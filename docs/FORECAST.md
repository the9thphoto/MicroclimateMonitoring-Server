# 预报模型接入契约

本文件定义地图工作台接入预报模型时的接口与渲染边界。当前实现只包含前端接缝（`apps/web/src/lib/forecast.ts`），没有真实预报数据，也不会用观测数据插值冒充预报场。

## 原则

- 观测与预报是独立数据源，时间轴和图层栏明确区分。
- 地图上的空间场只来自预报模型或明确的多站插值服务，不伪造。
- 单站详情显示观测与预报对比；分析页可增加预报检验。
- 不修改现有 `measurements` 表；预报数据使用独立存储与接口。

## 前端契约

`apps/web/src/lib/forecast.ts` 已定义：

```ts
interface ForecastCapabilities {
  provider: string;
  model: string;
  generatedAt: string;
  horizonHours: number;
  stepMinutes: number;
  bbox: [west, south, east, north];
  parameters: string[];
}

interface ForecastFrame {
  parameter: string;
  validAt: string;
  bbox: [west, south, east, north];
  width: number;
  height: number;
  values: number[]; // row-major
  noData: number;
}
```

接入时新增 `HttpForecastProvider`：

- 启动时请求 capabilities；失败或空结果时预报图层保持禁用。
- 仅在用户选中预报图层或展开预报时间轴时请求 frame。
- 大网格按 bbox 降采样，避免把整张网格放进 React state。
- 观测与预报在同一条数值时间轴上合并，标出「现在」分界。

## 后端接口（未来实现）

### `GET /api/v1/forecast/capabilities`

```json
{
  "provider": "internal",
  "model": "campus-wrf",
  "generatedAt": "2026-11-04T00:00:00Z",
  "horizonHours": 72,
  "stepMinutes": 60,
  "bbox": [121.40, 31.15, 121.60, 31.35],
  "parameters": ["temperature", "humidity", "wind", "precipitation"]
}
```

### `GET /api/v1/forecast/frames/{parameter}`

查询参数：

- `valid_at`：ISO 8601，必须带时区。
- `bbox`：`west,south,east,north`；缺省使用 capabilities 的 bbox。
- `width`、`height`：期望网格尺寸，服务端可降采样。

返回：

```json
{
  "parameter": "temperature",
  "validAt": "2026-11-04T06:00:00Z",
  "bbox": [121.40, 31.15, 121.60, 31.35],
  "width": 64,
  "height": 64,
  "values": [21.3, 21.5, 21.8],
  "noData": -9999
}
```

大范围或高分辨率场景可改为 PNG/二进制 Float32；前端适配器负责解码。响应应带 `ETag`/`Cache-Control`，并按 bbox 限制最大网格面积。

## 地图渲染

- 标量场：网格值 → canvas 色阶影像 → MapLibre `image` source + raster layer；透明度低于站点标记。
- 风场：u/v 分量 → 自定义 WebGL 粒子层；粒子密度与速度来自网格。
- 站点位置：按经纬度对网格做双线性插值，显示站点观测与预报对比。
- 预报地图降低底图标注对比度，避免与色斑争夺视觉层级。
- 所有图层必须带来源、模型名、有效时间与单位。

## 后端分期

1. 模型输出落盘/对象存储，生成 capabilities 与按需 frame。
2. 调度器按周期运行模型或拉取外部模型，保留版本与生成时间。
3. API 增加 bbox/尺寸限制、缓存和可观测性。
4. 前端增加预报图层、预报时间轴、站点对比和预报检验页。

当前不接入第三方预报 API，也不在数据库中写入预报值。
