# ASCII-Firework-NG

一个可部署在 Cloudflare Pages 等静态平台上的 serverless 网页互动小游戏：

- 页面初始为星空背景
- 用户每次点击页面，会在点击位置触发 ASCII 烟花爆炸

## 操作说明

- 点击画布：触发单次烟花爆炸
- `Alt+F12`：打开/关闭 God Mode 面板
- God Mode -> 高速连点：开启后按住鼠标可连续触发爆炸
- 连点频率：可在 5-60Hz 范围调节
- 设置仅在当前页面会话中生效，刷新后恢复默认

## 技术栈

- Vite
- TypeScript（strict）
- Canvas 2D（离屏采样 + ASCII 映射）
- ESLint + Prettier

## 快速开始

### 1) 安装依赖

```bash
pnpm install
```

### 2) 本地开发

```bash
pnpm run dev
```

### 3) 构建

```bash
pnpm run build
```

### 4) 本地预览构建产物

```bash
pnpm run preview
```

## Cloudflare Pages 部署

在 Cloudflare Pages 创建项目时使用：

- Build command: `pnpm run build`
- Build output directory: `dist`

完整初始化步骤见 [docs/cloudflare-pages-init.md](docs/cloudflare-pages-init.md)。

本项目为纯静态前端，无需 server runtime。

## 项目结构（colocation）

```text
src/
    app/       # 启动编排与生命周期
    engine/    # 动画循环、烟花粒子系统
    ascii/     # 亮度到字符映射
    render/    # 画布、星空、ASCII 渲染层
    platform/  # 输入与性能采样
    styles/    # 全局样式
```

## 说明

- 使用低分辨率离屏缓冲并映射到字符网格，降低渲染成本。
- 在低帧率时自动降级渲染质量，以提升弱设备流畅性。

## 开发规范

- 日志粒度与注释规范见 [docs/development-guidelines.md](docs/development-guidelines.md)
