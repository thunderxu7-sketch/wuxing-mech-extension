# 五行校准 Analytics Collector

最小化的 Cloudflare Worker，接收扩展上报的事件并写入 D1，同时承担商品点击的中转归因。

## 路由

- `GET /health` — 存活探针
- `POST /collect` — 接收 [`src/api/analytics.ts`](../src/api/analytics.ts) 的事件 envelope，写入 `events` 表
- `GET /click` — 接收商品点击，写入 `clicks` 表后 302 跳转到目的 URL（仅允许白名单 host）

## 文件

- `worker.ts` — Worker 入口
- `wrangler.jsonc` — Worker 配置，含 D1 binding
- `schema.sql` — D1 表结构（`events` + `clicks`）
- `README.md` — 本文件

事件 envelope 由 [`src/api/analytics.ts`](../src/api/analytics.ts) 产生：

```json
{
  "name": "popup_open",
  "site": "wuxing-mech-extension",
  "installId": "uuid",
  "sessionId": "uuid",
  "timestamp": "2026-04-10T08:30:00.000Z",
  "day": "2026-04-10",
  "properties": {}
}
```

商品点击 URL 由 [`src/utils/clickTracking.ts`](../src/utils/clickTracking.ts) 包装，形如：

```
https://wuxing-collector.<subdomain>.workers.dev/click
  ?to=https%3A%2F%2Fs.taobao.com%2Fsearch%3Fq%3D...
  &product=金属罗盘
  &loc=zh
  &site=wuxing-mech-extension
  &iid=<installId>
```

Worker 会校验 `to` 的 host 是否在白名单（`taobao.com`、`tmall.com`、`jd.com`、`pinduoduo.com`、`amazon.{com,co.uk,de,co.jp}`），写入 `clicks` 表后 302 跳转，避免成为开放重定向。

## 一次性部署步骤

> 全部命令在 `collector/` 目录下执行。

### 1. 登录 Cloudflare（如果还没登）

```sh
npx wrangler login
```

### 2. 创建 D1 数据库

```sh
npx wrangler d1 create wuxing-analytics
```

输出会包含一段 `database_id`，类似：

```
[[d1_databases]]
binding = "DB"
database_name = "wuxing-analytics"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

把这个 `database_id` 复制到 `wrangler.jsonc` 里 `REPLACE_ME` 的位置。

### 3. 应用表结构

```sh
npx wrangler d1 execute wuxing-analytics --remote --file=schema.sql
```

应该看到 `Executed N commands` 之类的输出。

### 4. 部署 Worker

```sh
npx wrangler deploy
```

部署成功后会打印 URL，类似 `https://wuxing-collector.<your-subdomain>.workers.dev`。**记下这个 URL。**

### 5. 冒烟测试

```sh
# 健康检查
curl https://wuxing-collector.<your-subdomain>.workers.dev/health

# 写入一条假事件
curl -X POST https://wuxing-collector.<your-subdomain>.workers.dev/collect \
  -H "Content-Type: application/json" \
  -d '{
    "name": "analytics_probe",
    "site": "wuxing-mech-extension",
    "installId": "test-install",
    "sessionId": "test-session",
    "timestamp": "2026-04-10T08:30:00.000Z",
    "day": "2026-04-10",
    "properties": {"probe": true}
  }'

# 查 D1 看是否落库
npx wrangler d1 execute wuxing-analytics --remote \
  --command "SELECT * FROM events ORDER BY id DESC LIMIT 5;"
```

### 6. 把 endpoint 接回扩展

把 `/collect` 完整 URL 提供给我，我会写进 `src/config/analytics.ts` 作为默认 endpoint，并把 `enabled` 默认改成 `true`。

## 升级已部署的 collector

如果你已经按照上面的步骤部署过 v1（只有 `events` 表 + `/collect` 路由），现在要拿到点击归因，需要：

```sh
# 应用最新 schema（新增 clicks 表 + 索引；已有的 events 表不会被破坏，CREATE TABLE IF NOT EXISTS）
npx wrangler d1 execute wuxing-analytics --remote --file=schema.sql

# 重新部署 worker（带上新的 /click 路由和白名单）
npx wrangler deploy
```

部署完后做一次冒烟：

```sh
# 模拟一次点击（应该 302 到淘宝搜索页）
curl -i "https://wuxing-collector.<your-subdomain>.workers.dev/click?to=https%3A%2F%2Fs.taobao.com%2Fsearch%3Fq%3Dtest&product=test&loc=zh&site=wuxing-mech-extension&iid=test-install"

# 看 D1 是否落库
npx wrangler d1 execute wuxing-analytics --remote \
  --command "SELECT * FROM clicks ORDER BY id DESC LIMIT 5;"
```

## 后续可以查的报表

```sh
# 昨日各事件次数
npx wrangler d1 execute wuxing-analytics --remote --command \
  "SELECT name, COUNT(*) AS n FROM events WHERE day = date('now','-1 day') GROUP BY name ORDER BY n DESC;"

# 累计独立安装数
npx wrangler d1 execute wuxing-analytics --remote --command \
  "SELECT COUNT(DISTINCT install_id) AS installs FROM events;"

# 最近 7 天每日生成运势次数
npx wrangler d1 execute wuxing-analytics --remote --command \
  "SELECT day, COUNT(*) AS n FROM events WHERE name = 'fortune_generated' AND day >= date('now','-7 day') GROUP BY day ORDER BY day;"

# 点击 Top 10 商品
npx wrangler d1 execute wuxing-analytics --remote --command \
  "SELECT product, COUNT(*) AS n FROM clicks GROUP BY product ORDER BY n DESC LIMIT 10;"

# 最近 7 天点击量按日聚合
npx wrangler d1 execute wuxing-analytics --remote --command \
  "SELECT date(received_at) AS day, COUNT(*) AS n FROM clicks WHERE received_at >= datetime('now','-7 day') GROUP BY day ORDER BY day;"

# 点击转化漏斗：有过 popup_open 的 install_id 中，有多少触发过点击
npx wrangler d1 execute wuxing-analytics --remote --command \
  "SELECT COUNT(DISTINCT install_id) AS clicked_installs FROM clicks;"
```

## 注意事项

- v1 没有鉴权，CORS 是 `*`，任何人都能写入。abuse 风险低（D1 免费额度足够），如果担心后续可加 `X-Wuxing-Site` 校验或共享密钥
- D1 免费额度：每日 5GB 存储 + 5M 行读 + 100K 行写，对扩展灰度阶段绰绰有余
- Worker observability 已开启，可在 Cloudflare 后台 → Workers → wuxing-collector → Logs 看实时请求
