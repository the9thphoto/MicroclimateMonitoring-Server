# 校园气候监测后端

基于 FastAPI 与 SQLAlchemy 的测量数据服务，接收并保存每台监测站的温度、湿度，以及可选的风速、风向、二氧化碳、PM2.5 和 PM10。当前温湿度设备只上报实际测量的两项，其余指标保存为 `NULL`。

完整字段、范围、单位、状态码和部署参数见 [PARAMETERS.txt](PARAMETERS.txt)。

## 本地运行

要求 Python 3.11 或更高版本。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

设备通过局域网访问时必须监听 `0.0.0.0`；只在本机调试时可改回 `127.0.0.1`。

服务启动后：

- API 文档：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/health`
- 默认数据文件：`data/weather.db`

Linux/macOS 将虚拟环境激活命令替换为 `source .venv/bin/activate`。

## 配置

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./data/weather.db` | SQLite 或 PostgreSQL 连接地址 |
| `CORS_ORIGINS` | 本地 Vite 地址 | 允许跨域的前端地址，逗号分隔；设为 `*` 允许全部 |
| `APP_NAME` | `Campus Weather Monitor API` | OpenAPI 服务名称 |
| `PORT` | `8000` | 容器监听端口 |
| `WEB_CONCURRENCY` | `1` | Uvicorn 工作进程数 |

PostgreSQL 示例：

```text
DATABASE_URL=postgresql+psycopg://weather:weather@127.0.0.1:5432/weather
```

默认配置适合单机或小规模部署。多实例、高并发部署应使用 PostgreSQL，并让 `WEB_CONCURRENCY` 大于 1。

## 接口

### 上报测量

`POST /api/v1/measurements`

```json
{
  "station_id": "station-01",
  "observed_at": "2026-10-29T08:30:00+08:00",
  "wind_speed": 2.8,
  "wind_direction": 135,
  "temperature": 21.6,
  "humidity": 63,
  "co2": 418,
  "pm25": 18,
  "pm10": 34
}
```

| 字段 | 必填 | 单位 | 有效范围 |
| --- | --- | --- | --- |
| `temperature` | 是 | °C | -100–100 |
| `humidity` | 是 | % | 0–100 |
| `wind_speed` | 否 | m/s | 0–100 |
| `wind_direction` | 否 | 度 | 0–360 |
| `co2` | 否 | ppm | 0–100000 |
| `pm25` | 否 | μg/m³ | 0–10000 |
| `pm10` | 否 | μg/m³ | 0–10000 |

`observed_at` 可省略，省略时使用服务器接收时间。提供时必须是带时区的 ISO 8601 时间，服务会统一保存为 UTC。`station_id` 最长 64 个字符。可选的传感器字段可以完全省略或显式传 `null`，响应和数据库中都保存为 `null`，不会用 0 冒充测量值。

设备最小上报示例：

```json
{
  "station_id": "station-01",
  "observed_at": "2026-11-04T08:30:00Z",
  "temperature": 21.6,
  "humidity": 63.0
}
```

对应的响应中 `wind_speed`、`wind_direction`、`co2`、`pm25`、`pm10` 均为 `null`。

### 查询历史

`GET /api/v1/measurements`

查询参数：

- `station_id`：按站点筛选
- `start`、`end`：按采集时间筛选，需带时区
- `offset`：跳过条数，默认 0
- `limit`：返回条数，默认 100，最大 1000

结果按采集时间倒序排列。

### 查询最新测量

`GET /api/v1/measurements/latest?station_id=station-01`

不传 `station_id` 时返回全部站点中最新的一条；无数据时返回 404。

## 设备接入

ESP32 固件通过 HTTP 直接上报，不需要 Mac 端中继脚本：

```text
POST http://<server>:8000/api/v1/measurements
Content-Type: application/json

{"station_id":"station-01","temperature":21.6,"humidity":63.0,"observed_at":"2026-11-04T08:30:00Z"}
```

- 设备默认每 60 秒聚合上报一次，`station_id` 在固件配置中设置。
- 设备通过 SNTP 获取 UTC 时间；未同步时省略 `observed_at`，由服务端记录接收时间。
- 温度取寄存器 `0x0001` 的有符号值 ÷ 10，湿度取寄存器 `0x0000` 的无符号值 ÷ 10。
- 风速、风向、CO2、PM2.5、PM10 不在当前设备上，缺失即 `null`。
- 服务端接口没有鉴权，只应部署在受控局域网，或放在带鉴权和 HTTPS 的反向代理之后。

## 数据库升级

新数据库由 `Base.metadata.create_all` 直接创建 nullable 列。已有数据库需要手动升级：

- SQLite：停止服务后删除 `data/weather.db` 重建；如必须保留旧数据，按“重建表并复制数据”的方式处理。
- PostgreSQL：执行以下语句（重复执行前先确认列仍为 `NOT NULL`）：

```sql
ALTER TABLE measurements ALTER COLUMN wind_speed DROP NOT NULL;
ALTER TABLE measurements ALTER COLUMN wind_direction DROP NOT NULL;
ALTER TABLE measurements ALTER COLUMN co2 DROP NOT NULL;
ALTER TABLE measurements ALTER COLUMN pm25 DROP NOT NULL;
ALTER TABLE measurements ALTER COLUMN pm10 DROP NOT NULL;
```

## 容器部署

仅启动 API（内部使用 SQLite，数据保存在 `data/` 卷）：

```powershell
docker build -t campus-weather-api .
docker run --rm -p 8000:8000 -v weather-data:/app/data campus-weather-api
```

API 与 PostgreSQL 一起启动。先复制模板，`docker-compose.yml` 已被 `.gitignore` 忽略，适合保存本机密码和端口：

```powershell
Copy-Item docker-compose.example.yml docker-compose.yml
docker compose -f docker-compose.yml up --build -d
```

模板见 [docker-compose.example.yml](docker-compose.example.yml)。生产环境应替换示例数据库密码、限制 `CORS_ORIGINS`，并在反向代理或云平台配置 HTTPS。

## 测试

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest
```

真实 HTTP E2E 回归需要先启动服务（建议使用临时数据库），再执行：

```powershell
python tests/e2e_regression.py --base-url http://127.0.0.1:8000
```

脚本覆盖健康检查、完整/部分上报、校验失败、历史查询、筛选、分页、最新值、CORS、OpenAPI 与路由状态码。重启服务后可加 `--check-station e2e-persist` 验证持久化记录仍在。
