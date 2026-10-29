# 校园气候监测后端

基于 FastAPI 与 SQLAlchemy 的测量数据服务，接收并保存每台监测站的风速、风向、温度、湿度、二氧化碳、PM2.5 和 PM10。

完整字段、范围、单位、状态码和部署参数见 [PARAMETERS.txt](PARAMETERS.txt)。

## 本地运行

要求 Python 3.11 或更高版本。

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

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

| 字段 | 单位 | 有效范围 |
| --- | --- | --- |
| `wind_speed` | m/s | 0–100 |
| `wind_direction` | 度 | 0–360 |
| `temperature` | °C | -100–100 |
| `humidity` | % | 0–100 |
| `co2` | ppm | 0–100000 |
| `pm25` | μg/m³ | 0–10000 |
| `pm10` | μg/m³ | 0–10000 |

`observed_at` 可省略，省略时使用服务器接收时间。提供时必须是带时区的 ISO 8601 时间，服务会统一保存为 UTC。`station_id` 最长 64 个字符。

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

## 容器部署

仅启动 API（内部使用 SQLite，数据保存在 `data/` 卷）：

```powershell
docker build -t campus-weather-api .
docker run --rm -p 8000:8000 -v weather-data:/app/data campus-weather-api
```

API 与 PostgreSQL 一起启动：

```powershell
docker compose up --build -d
```

生产环境应替换示例数据库密码、限制 `CORS_ORIGINS`，并在反向代理或云平台配置 HTTPS。

## 测试

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest
```
