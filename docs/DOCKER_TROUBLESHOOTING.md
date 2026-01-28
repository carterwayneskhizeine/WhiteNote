# Docker 配置问题记录

## 概述

本文档记录了将 WhiteNote 项目从本地 pnpm 开发迁移到 Docker Compose 开发环境时遇到的所有问题、尝试的解决方案和当前状态。

**最后更新**: 2026-01-29
**状态**: ❌ 未解决 - Tailwind CSS 编译错误

---

## 环境信息

- **操作系统**: Windows (MSYS_NT-10.0-26200)
- **Docker Desktop**: 已安装并运行
- **Node.js 版本**:
  - Docker 镜像: `node:24.13.0-alpine` (原始) → `node:20-alpine` (尝试)
- **包管理器**: pnpm
- **Next.js**: 16.1.1 (Turbopack)
- **Tailwind CSS**:
  - 原始: v4.1.18 (预发布版本)
  - 降级尝试: v3.4.17

---

## 问题 1: pnpm 构建脚本警告

### 错误信息
```
Ignored build scripts: @prisma/engines@7.2.0, esbuild@0.27.2,
msgpackr-extract@3.0.3, prisma@7.2.0, sharp@0.34.5, unrs-resolver@1.11.1.
```

### 尝试的解决方案
1. ❌ 在 Dockerfile 中添加 `RUN echo "enable-pre-post-scripts=true" > .npmrc`
2. ❌ 安装系统依赖: `apk add --no-cache python3 make g++`
3. ✅ **最终方案**: 移除构建脚本配置，让 pnpm 使用预编译的二进制文件

### 结果
警告被忽略，但原生模块（Prisma、Sharp）使用预编译版本正常工作。

---

## 问题 2: Node.js 版本不兼容

### 错误信息
```
RangeError: Invalid code point 2943866
    at String.fromCodePoint (<anonymous>)
    [at tailwindcss@4.1.18/node_modules/tailwindcss/dist/lib.js:1:5550]
```

### 尝试的解决方案

#### 方案 A: 使用 Node.js 24.13.0
- **结果**: ❌ 失败
- **原因**: Tailwind CSS 4.x 与 Node.js 24 不兼容

#### 方案 B: 降级到 Node.js 20
- **结果**: ❌ 仍然失败
- **修改**: `FROM node:20-alpine`
- **原因**: Tailwind CSS 4.x 本身的 bug，与 Node.js 版本无关

### 结论
此错误是 Tailwind CSS v4 的内部 bug，不是 Node.js 版本问题。

---

## 问题 3: Tailwind CSS v4 的 Invalid Code Point 错误 ⭐

### 错误详情
```
RangeError: Invalid code point 2943866
CssSyntaxError: tailwindcss: /app/src/app/globals.css:1:1: Invalid code point 2943866
```

**错误位置**: `tailwindcss/dist/lib.js:1:5550`
**触发**: Tailwind CSS 在处理 CSS 文件时调用 `String.fromCodePoint()`
**原因**: 代码点 `2943866` 超出有效 Unicode 范围（最大 0x10FFFF）

### 根本原因
- **Tailwind CSS v4.1.18** 是预发布版本
- 存在已知的 `String.fromCodePoint()` bug
- 在 Docker Alpine 环境中更容易触发
- 与文件挂载和编码处理有关

### 尝试的解决方案

#### 方案 A: 升级 Tailwind CSS v4
```bash
pnpm update tailwindcss @tailwindcss/postcss @tailwindcss/typography --latest
```
- **结果**: ❌ 最新版仍有此 bug

#### 方案 B: 降级到 Tailwind CSS v3

**执行的步骤**:

1. 卸载 v4:
```bash
pnpm remove tailwindcss @tailwindcss/postcss @tailwindcss/typography tw-animate-css
```

2. 安装 v3:
```bash
pnpm add -D tailwindcss@^3.4.17 autoprefixer@^10.4.20 postcss@^8.4.49
pnpm add -D @tailwindcss/typography@^0.5.15
```

3. 修改 `postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

4. 创建 `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        // ... (完整的颜色配置)
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
```

5. 修改 `globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  /* ... 其他 CSS 变量 */
}
```

- **结果**: ❌ 新错误（见问题 4）

---

## 问题 4: Tailwind CSS v3 自定义类不存在

### 错误信息
```
CssSyntaxError: /app/src/app/globals.css:1:1:
The `outline-ring/50` class does not exist.
If `outline-ring/50` is a custom class, make sure it is defined within a `@layer` directive.
```

### 触发位置
`globals.css` 中的 `@layer base` 部分使用了 `outline-ring/50` 等自定义类。

### 问题原因
v3 中缺少自定义 Tailwind 类的定义，这些类在 v4 中是通过 `@theme inline` 自动生成的。

### 尝试的解决方案
❌ 未完成 - 需要手动在 `tailwind.config.ts` 中定义所有缺失的自定义类

---

## 问题 5: Docker 文件共享权限

### 问题描述
在 Docker Desktop for Windows 中，容器无法访问宿主机的 `D:\Code\whitenote-data` 目录。

### 解决方案 ✅
在 Docker Desktop 设置中添加文件共享：
1. **Settings** → **Resources** → **File sharing**
2. 添加路径:
   - `D:\Code\whitenote`
   - `D:\Code\whitenote-data`
3. **Apply & Restart**

### 结果
✅ 解决了文件访问问题，但 Tailwind CSS 错误仍然存在。

---

## 问题 6: Docker 卷挂载配置

### 问题
在 `docker-compose.yml` 中使用了匿名卷 `/app/.next`，导致容器内构建目录被覆盖。

### 解决方案 ✅
移除以下挂载配置：
```yaml
volumes:
  - .:/app
  - /app/node_modules
  # ❌ 移除: - /app/.next  # 这会干扰构建
```

### 结果
✅ 容器可以正常构建，但 Tailwind CSS 编译仍然失败。

---

## 当前状态

### ✅ 已解决的问题
1. ✅ Docker 基础配置和服务启动
2. ✅ 数据库连接和持久化
3. ✅ 文件上传目录挂载
4. ✅ 文件监听器目录挂载
5. ✅ Prisma Client 生成
6. ✅ Worker 服务正常运行
7. ✅ App 服务可以启动并监听 3005 端口

### ❌ 未解决的问题
1. ❌ **Tailwind CSS 编译错误**（主要阻塞问题）
   - v4: `Invalid code point` 错误
   - v3: 自定义类不存在错误

### 🔄 工作但有限制的状态
- ✅ 服务器可以启动
- ✅ Worker 可以运行
- ❌ 首次访问页面时 CSS 编译失败 (HTTP 500)
- ❌ 无法正常渲染 UI

---

## 已配置的功能

### Docker Compose 服务
- **app**: Next.js 应用服务器（端口 3005）
- **worker**: 后台任务处理器
- **postgres**: PostgreSQL 16 数据库（端口 5925）
- **redis**: Redis 缓存和队列（端口 4338）
- **pgadmin**: PostgreSQL 管理界面（端口 5050）

### 卷挂载
| 宿主机路径 | 容器内路径 | 用途 |
|-----------|-----------|------|
| `D:\Code\whitenote-data\uploads` | `/app/data/uploads` | 上传的媒体文件 |
| `D:\Code\whitenote-data\link_md` | `/app/data/link_md` | 文件监听器目录 |

### 环境变量
- `NODE_ENV`: development / production
- `DATABASE_URL`: PostgreSQL 连接字符串
- `REDIS_URL`: Redis 连接字符串
- `UPLOAD_DIR`: `/app/data/uploads`
- `RAGFLOW_*`: RAGFlow AI 服务配置
- `ENCRYPTION_KEY`: API 密钥加密
- `FILE_WATCHER_*`: 文件监听器配置

---

## 推荐的后续解决方案

### 方案 A: 完整迁移到 Tailwind CSS v3
1. 在 `tailwind.config.ts` 中定义所有缺失的自定义类
2. 重写 `globals.css` 使用 v3 语法
3. 测试所有 UI 组件的样式
4. 修复可能的样式问题

**优点**: v3 是稳定版本，有完整文档
**缺点**: 需要大量 CSS 工作量

### 方案 B: 等待 Tailwind CSS v4 修复
1. 关注 Tailwind CSS v4 的 GitHub issues
2. 等待稳定版本发布
3. 临时使用 CSS-in-JS 或内联样式

**优点**: 长期解决方案
**缺点**: 无法预期修复时间

### 方案 C: 使用 Docker 卷而非挂载
1. 移除源代码挂载
2. 每次代码更改后重新构建镜像
3. 适合生产环境，不适合开发

**优点**: 避免文件系统问题
**缺点**: 失去热重载功能

### 方案 D: 切换到不同的 CSS 框架
1. 考虑使用 Bootstrap v5
2. 或使用 CSS Modules + Sass
3. 或使用 styled-components

**优点**: 避开 Tailwind CSS 的问题
**缺点**: 需要重写所有组件样式

---

## 相关文件

### Docker 配置
- [Dockerfile](../Dockerfile) - Docker 镜像构建配置
- [docker-compose.yml](../docker-compose.yml) - 服务编排配置
- [.dockerignore](../.dockerignore) - Docker 构建忽略文件

### 环境配置
- [.env](../.env) - 本地环境变量（不提交）
- [.env.dev.example](../.env.dev.example) - Docker 开发环境配置模板

### Tailwind CSS 配置
- [tailwind.config.ts](../tailwind.config.ts) - Tailwind v3 配置
- [postcss.config.mjs](../postcss.config.mjs) - PostCSS 配置
- [src/app/globals.css](../src/app/globals.css) - 全局样式文件

### 文档
- [DOCKER.md](../DOCKER.md) - Docker 使用指南
- [CLAUDE.md](../CLAUDE.md) - 项目概述

---

## 技术债务

1. **Tailwind CSS 版本**: v4 → v3 降级未完成
2. **CSS 语法**: v4 新语法 → v3 传统语法需要转换
3. **自定义类**: 需要手动定义所有自定义 Tailwind 类
4. **主题配置**: `@theme inline` → `tailwind.config.ts` 需要迁移

---

## 有用的命令

### 开发命令
```bash
# 启动开发环境
NODE_ENV=development docker-compose up app worker

# 重新构建镜像
docker-compose build --no-cache app worker

# 查看日志
docker-compose logs -f app
docker-compose logs -f worker

# 进入容器调试
docker-compose exec app sh
```

### 数据库操作
```bash
# 推送 schema
docker-compose exec app pnpm prisma db push

# 初始化种子数据
docker-compose exec app pnpm prisma db seed

# 重置数据库
docker-compose exec postgres psql -U myuser -d postgres -c "DROP DATABASE IF EXISTS whitenote;"
docker-compose exec postgres psql -U myuser -d postgres -c "CREATE DATABASE whitenote;"
docker-compose exec app pnpm prisma db push
docker-compose exec app pnpm prisma db seed
```

---

## 参考资源

### Tailwind CSS
- [v3 官方文档](https://tailwindcss.com/docs)
- [v4 文档（预览）](https://tailwindcss.com/docs/v4-beta)
- [GitHub Issues](https://github.com/tailwindlabs/tailwindcss/issues)

### Docker
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Windows 文件共享](https://docs.docker.com/desktop/settings/)

### Next.js
- [Next.js 16 文档](https://nextjs.org/docs)
- [Turbopack 文档](https://nextjs.org/docs/architecture/turbopack)

---

**维护者注意**: 此文档记录了问题解决过程中的所有尝试。在解决 Tailwind CSS 问题后，请更新此文档。
