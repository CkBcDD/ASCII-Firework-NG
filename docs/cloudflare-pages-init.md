# Cloudflare Pages 初始化指南

本文档用于在 Cloudflare Pages 上初始化并部署本项目。

## 初始化参数

在 Cloudflare Pages 创建项目时，使用以下配置：

- Framework preset: `Vite`
- Root directory: `/`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm run build`
- Build output directory: `dist`
- Node.js version: `20.19.0`（与仓库 `.nvmrc` 保持一致）

## 参数来源说明

- `Build command` 来自 [package.json](../package.json) 的 `scripts.build`。
- `Install command` 使用 pnpm 并基于 `pnpm-lock.yaml` 做冻结安装。
- `Build output directory` 为 Vite 默认产物目录；当前配置未覆盖 `outDir`。

## 初始化步骤

1. 登录 Cloudflare 控制台，进入 **Workers & Pages**。
2. 选择 **Create** -> **Pages** -> **Connect to Git**。
3. 连接仓库 `CkBcDD/ASCII-Firework-NG`。
4. 在构建配置中填入“初始化参数”章节的内容。
5. 点击 **Save and Deploy** 完成首次部署。
6. 若此前项目使用 npm，请在 Pages 项目设置中确认已切换为上述 pnpm 安装/构建命令。

## 环境变量

- 当前项目无必需环境变量。
- 若后续引入前端环境变量，请在 Pages 中以 `VITE_` 前缀配置（例如 `VITE_API_BASE_URL`）。

## 可选项

- 本项目当前不依赖前端路由。
- 若未来接入 History 路由，可新增 `public/_redirects` 并写入：

```text
/* /index.html 200
```

## 部署后检查

- 页面可正常加载并显示星空背景。
- 点击页面可触发 ASCII 烟花。
- 控制台无阻塞性报错。
