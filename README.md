# 校园微气候监测后端

基于 Go 与 TypeScript 的 monorepo：Go API 接收并保存监测站数据，React 仪表盘展示最新值与历史趋势。设备固件仍通过 HTTP 直接上报。

```text
ESP32-C3 (C/ESP-IDF, 独立仓库)
        │ POST /api/v1/measurements
        ▼
apps/api (Go 1.27, chi + Huma) ──► PostgreSQL 17+
        ▲
        │ /api, /health, /openapi.json
apps/web (React 19 + Vite 8) ◄── nginx（生产）或 Vite 代理（开发）
```

完整字段、范围、单位、状态码和部署参数见 [PARAMETERS.txt](PARAMETERS.txt)。

## Monorepo 结构

| 路径 | 职责 |
| --- | --- |
| `apps/api` | Go API、领域逻辑、PostgreSQL 访问、goose 迁移 |
| `apps/api/cmd/api` | 进程入口、HTTP 生命周期、`healthcheck` 子命令 |
| `apps/api/cmd/openapi` | 输出 OpenAPI 文档，供 Web 生成类型 |
| `apps/api/internal/config` | 环境变量解析与校验 |
| `apps/api/internal/platform/postgres` | pgxpool 创建与 Ping |
| `apps/api/internal/platform/migrate` | 内嵌 SQL、goose、advisory lock |
| `apps/api/internal/measurement` | 领域模型、Service、Repository 接口与校验 |
| `apps/api/internal/measurement/postgres` | Repository 的 pgx 实现 |
| `apps/api/internal/httpapi` | Huma 路由、DTO、错误映射 |
| `apps/api/internal/middleware` | CORS、请求日志、recover、body limit |
| `apps/web` | 页面组装、查询 hooks、Playwright E2E |
| `packages/contracts` | OpenAPI JSON、生成的 TS 类型、API 常量 |
| `packages/api-client` | 类型化客户端、分页与错误归一化 |
| `packages/ui` | 纯展示组件、图表、样式 |
| `packages/config` | 共享 TypeScript / Biome 配置 |
| `packages/contracts/openapi.json` | Go 端生成的唯一契约来源 |

依赖方向：`web → api-client/ui → contracts`；Go 侧 `cmd → httpapi/measurement/postgres/migrate`，`measurement` 不依赖 HTTP 或 pgx。

## 环境要求

- Go 1.27+
- Node.js 26+、pnpm 11+
- PostgreSQL 17+（本地安装或 Docker）
- Docker 与 Docker Compose（容器部署/本地数据库）

## 本地运行

```bash
cd server
nvm use          # .nvmrc pins Node 26
cp .env.example .env
docker compose -f docker-compose.example.yml up -d db

set -a
. ./.env
set +a

pnpm install
make api        # 终端 1：http://127.0.0.1:8000
pnpm dev        # 终端 2：http://127.0.0.1:5173
```

API 启动时会在 advisory lock 内自动执行 goose 迁移，空库会直接建表。也可以手动执行：

```bash
make migrate          # goose up
make migrate-status   # 查看版本
```

`docker-compose.example.yml` 把 PostgreSQL 暴露在宿主机 `127.0.0.1:5433`，仅供本机开发；容器内的 API 使用 `db:5432`。如端口冲突，修改 `.env` 的 `DB_PORT` 与 `DATABASE_URL`。

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | 仅支持 PostgreSQL，例如 `postgresql://weather:weather@127.0.0.1:5433/weather` |
| `TEST_DATABASE_URL` | 测试 | 测试库，库名必须以 `_test` 结尾 |
| `CORS_ORIGINS` | 否 | 允许跨域的前端地址，逗号分隔 |
| `APP_NAME` | 否 | OpenAPI 服务名称 |
| `PORT` | 否 | API 监听端口，默认 8000 |
| `DB_PORT` | 否 | Compose 暴露到宿主机的数据库端口，默认 5433 |
| `WEB_PORT` | 否 | Compose 暴露的 Web 端口，默认 8080 |

`DATABASE_URL` 缺失、使用 SQLite、或仍带 Python 的 `+psycopg` 前缀时，进程会直接失败并给出修正提示。

## 接口

- `POST /api/v1/measurements`：上报一条聚合测量，返回 201。
- `GET /api/v1/measurements`：按站点、时间范围分页查询，默认 100 条，最大 1000。
- `GET /api/v1/measurements/latest`：最新一条，无数据返回 404。
- `GET /health`：数据库可用时返回 `{"status":"ok"}`，否则 503。
- `GET /openapi.json`、`GET /docs`：OpenAPI 3.1 文档。

成功响应的字段与旧版本保持一致：可选的传感器字段在响应中始终存在，缺失时为 `null`。校验错误使用 RFC 9457 `application/problem+json`；非法 JSON（包括 `NaN`/`Infinity` 字面量）返回 400。

设备示例（与固件一致）：

```json
{"station_id":"station-01","temperature":21.6,"humidity":63.0,"observed_at":"2026-11-04T08:30:00Z"}
```

## 数据库与迁移

- 唯一的 schema 来源是 `apps/api/internal/platform/migrate/sql/*.sql`，由 goose 管理，版本表为 `goose_db_version`。
- API 启动时获取 `pg_advisory_lock`，执行未应用的迁移后释放；多实例启动不会并发改表。
- 旧版 Python 服务已用 `create_all` 建过 PostgreSQL 表的，先接管版本，再启动：

```bash
make migrate-stamp   # goose stamp 1
```

- 新增迁移：在 `sql/` 下增加带 `-- +goose Up` / `-- +goose Down` 的文件；不要修改已应用的迁移。
- `goose down` 会删除 `measurements` 表和数据，只能用于测试库。

## 数据保留与备份

**数据永久保留**：没有 TTL、清理任务、归档任务或 DELETE 接口。`measurements` 表只增不减。

备份（Compose）：

```bash
docker compose exec -T db pg_dump -U weather -Fc weather > "weather-$(date +%F).dump"
cat "weather-$(date +%F).dump" | docker compose exec -T db pg_restore -U weather -d weather --clean --if-exists
```

`docker compose down` 保留 `weather-data` 卷；`docker compose down -v` 会删除全部数据，禁止在含真实数据的部署中使用。

## 测试

```bash
# 需要可访问的 PostgreSQL 测试库；库名必须以 _test 结尾
make test          # Go（-p 1）+ 所有 TS 包单测
pnpm typecheck     # 全 workspace 类型检查
pnpm lint          # Biome
pnpm e2e           # 构建 Web + Playwright（自动启动 API 与 preview）
```

测试库默认使用 `postgresql://weather:weather@127.0.0.1:5433/weather_test`，可通过 `TEST_DATABASE_URL` 覆盖；Go 测试在缺失时会尝试自动创建。Compose 首次初始化命名卷时会通过数据库镜像内的 `docker/db/initdb` 自动创建 `weather_test`；已有卷则手动执行 `docker compose exec db createdb -U weather weather_test`。

## 容器部署

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose -f docker-compose.yml up --build -d
```

- API：`http://<host>:8000`，设备继续上报到该地址。
- Web：`http://<host>:8080`，nginx 反向代理 `/api`、`/health`、`/openapi.json`、`/docs`。
- PostgreSQL：使用 Docker 命名卷 `weather-data` 持久化数据（不使用宿主机 bind mount），只绑定宿主机回环地址；测试库初始化脚本通过 `docker/db/Dockerfile` 固化进数据库镜像，不使用宿主机 bind mount。
- API 镜像为 distroless nonroot，迁移代码已内嵌；容器启动时自动迁移。
- 生产环境必须替换示例密码、限制 `CORS_ORIGINS`，并在反向代理或云平台配置 HTTPS。

## CI

GitHub Actions 工作流位于 [.github/workflows/ci.yml](.github/workflows/ci.yml)：

| Job | 内容 |
| --- | --- |
| `api` | gofmt、go vet、`go test -p 1 ./...`、build |
| `web` | pnpm 安装、Biome、typecheck、Vitest、build |
| `contracts` | 生成 OpenAPI/TS 类型后检查漂移 |
| `e2e` | PostgreSQL service、真实 API、Playwright |
| `docker` | 构建 API/Web 镜像 |

本地用 `act` 验证（需要 Docker，且能访问 Docker Hub）：

```bash
act push
# 或单个 job
act push -j api
act push -j web
act push -j contracts
```

工作流为 `api` 与 `e2e` 分别使用 PostgreSQL service 发布端口 `55432`、`55433`，避免 act 并行执行时端口冲突；`docker` job 在 `act` 下自动跳过构建步骤。首次运行需要能访问 Docker Hub 拉取 act runner、PostgreSQL 与 Playwright 浏览器依赖。

## 设备接入

ESP32 固件仓库保持不变：

- 上报地址：`http://<server>:8000/api/v1/measurements`
- 每 60 秒一条聚合记录，`station_id` 默认 `station-01`
- SNTP 未同步时省略 `observed_at`
- 温度/湿度为实测值，其余传感器字段省略或传 `null`

接口没有鉴权，只应部署在受控局域网，或放在带鉴权和 HTTPS 的反向代理之后。

## 标签发布与 CD Agent

生产部署在 `10.126.126.78`，由独立仓库 `microclimate-cd-agent`（本地 `../cd`）负责：

- `build-X.Y.Z`：GitHub-hosted CI，执行测试和 Dockerfile 构建验证。
- `deploy-X.Y.Z`：目标机 CD agent 检出该 tag，构建并启动 `deploy/compose.yaml`。
- 同一个 commit 可以同时打两个 tag；先推 `build-*`，等 CI 成功后再推 `deploy-*`。

CD agent 只轮询 `deploy-*` 标签，校验对应 `build.yml` 成功后才部署；失败自动回滚到上一版本。目标机端口：

- API：`0.0.0.0:8000`（设备上报）
- Web：`0.0.0.0:8080`
- PostgreSQL：仅内部网络，命名卷 `microclimate_weather-data`

现有 nginx 80/443 不改动。安装与状态说明见 CD agent 仓库的 `README.md`；生产 Compose 见 [deploy/compose.yaml](deploy/compose.yaml)。
