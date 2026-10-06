# Cloudflare 部署与认证恢复

本仓库的 `wrangler.jsonc` 必须随代码提交。Vite 使用该配置构建 Worker 与静态资源，构建检查会拒绝缺少 Worker 入口、原 D1 绑定或 API 路由配置的产物。

Cloudflare Workers Builds 使用：

- 构建命令：`pnpm run build`
- 部署命令：`pnpm run deploy`
- 根目录：仓库根目录
- 生产分支：`main`

生产绑定名为 `DB`，连接已有的 `navigation-db`。恢复部署不需要调用 `/api/init`、执行 SQL、运行迁移或创建数据库。

在 Worker 的 **设置 → 变量和机密** 中恢复原值（不是构建环境变量）：

- `AUTH_USERNAME`：原管理员用户名。
- `AUTH_PASSWORD`：原 bcrypt 密码哈希，不是明文密码。
- `AUTH_SECRET`：原 JWT 签名密钥。

三项均可配置为机密；不要写入 Git、聊天或截图。配置使用 `keep_vars: true` 保留控制台变量。生产默认启用认证并允许访客查看公开内容；缺少管理员配置时公开读取仍可用，登录与受保护操作返回 503。

验证命令：

```sh
pnpm lint --max-warnings 0
pnpm test
pnpm build
pnpm test:worker
```

`test:worker` 使用构建后的真实 Worker 和独立临时 D1 数据库，不连接生产数据库。上线后检查 `/api/auth/status`、`/api/groups-with-sites` 和 `/api/configs` 返回 JSON，并确认首页显示原有公开内容。
