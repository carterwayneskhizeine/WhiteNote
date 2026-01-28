# Docker 使用指南 (Docker Usage Guide)

## 快速开始 (Quick Start)

### 开发模式 (Development Mode)
```bash
# 启动所有服务（包括热重载）
NODE_ENV=development docker compose up

# 或者只启动应用
NODE_ENV=development docker compose up app worker
```

### 生产模式 (Production Mode)
```bash
# 启动所有服务（优化构建）
NODE_ENV=production docker compose up -d

# 或者只启动应用
NODE_ENV=production docker compose up -d app worker
```

## 服务说明 (Services)

### 基础设施服务 (Infrastructure)
- **postgres**: PostgreSQL 16 数据库 (端口 5925)
- **redis**: Redis 缓存和队列 (端口 4338)
- **pgadmin**: PostgreSQL 管理界面 (端口 5050)

### 应用服务 (Application)
- **app**: Next.js 主应用服务器 (端口 3005)
  - 开发模式：运行 `pnpm build` + `pnpm dev`（热重载）
  - 生产模式：运行 `pnpm start`
- **worker**: 后台任务处理器
  - 运行定时任务和异步作业

## 数据持久化 (Data Persistence)

### 卷挂载说明 (Volume Mounts)

所有重要数据都已挂载到宿主机，确保容器删除后数据不会丢失：

| 宿主机路径 | 容器内路径 | 用途 |
|-----------|-----------|------|
| `D:\Code\whitenote-data\uploads` | `/app/data/uploads` | 用户上传的图片和视频文件 |
| `D:\Code\whitenote-data\link_md` | `/app/data/link_md` | 文件监听器监听的 Markdown 文件 |
| (Docker 卷) | `/var/lib/postgresql/data` | PostgreSQL 数据库文件 |
| (Docker 卷) | `/data` | Redis 持久化数据 |
| (Docker 卷) | `/var/lib/pgadmin` | pgAdmin 配置数据 |

### 上传的文件存储位置

用户通过应用上传的所有图片和视频文件都会保存在：
```
D:\Code\whitenote-data\uploads
```

这些文件会被持久化存储，即使删除容器也不会丢失。你可以直接在宿主机访问和管理这些文件。

## 常用命令 (Common Commands)

```bash
# 构建镜像
docker compose build

# 启动所有服务
docker compose up -d

# 查看日志
docker compose logs -f app
docker compose logs -f worker

# 停止服务
docker compose down

# 停止服务并删除数据卷（⚠️ 会删除数据库数据）
docker compose down -v

# 重启服务
docker compose restart app worker

# 进入容器调试
docker compose exec app sh
docker compose exec worker sh

# 在容器中运行命令
docker compose exec app pnpm prisma db push
docker compose exec app pnpm prisma db seed
```

## 环境变量切换 (Switching Modes)

### 方法 1: 使用环境变量（推荐）
```bash
# 开发模式
NODE_ENV=development docker compose up app worker

# 生产模式
NODE_ENV=production docker compose up app worker
```

### 方法 2: 创建 .env 文件
```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 文件
echo "NODE_ENV=development" > .env
```

## 数据库操作 (Database Operations)

```bash
# 推送 schema
docker compose exec app pnpm prisma db push

# 初始化种子数据
docker compose exec app pnpm prisma db seed

# 打开 Prisma Studio（需要映射端口）
docker compose exec app pnpm prisma studio

# 重置数据库（⚠️ 删除所有数据）
docker compose exec postgres psql -U myuser -d postgres -c "DROP DATABASE IF EXISTS whitenote;"
docker compose exec postgres psql -U myuser -d postgres -c "CREATE DATABASE whitenote;"
docker compose exec app pnpm prisma db push
docker compose exec app pnpm prisma db seed
```

## 故障排查 (Troubleshooting)

### 端口冲突
如果端口被占用，修改 `docker compose.yml` 中的端口映射：
```yaml
ports:
  - "新端口:容器端口"
```

### 权限问题
在 Windows/Mac 上通常不会有权限问题。在 Linux 上，可能需要调整文件权限。

### 容器重启
```bash
# 查看容器状态
docker compose ps

# 查看特定服务的日志
docker compose logs app
docker compose logs worker

# 重启特定服务
docker compose restart app
```

### 清理和重建
```bash
# 停止并删除容器、网络
docker compose down

# 删除所有数据（包括数据库）
docker compose down -v

# 重新构建镜像
docker compose build --no-cache

# 完全清理后重新启动
docker compose down -v && docker compose build --no-cache && docker compose up -d
```

## 性能优化 (Performance Tips)

1. **生产环境**: 始终使用 `NODE_ENV=production`
2. **资源限制**: 可以在 docker compose.yml 中添加资源限制
3. **健康检查**: postgres 和 redis 已配置健康检查，app 服务会等待它们就绪
4. **数据卷**: 使用命名卷而不是绑定挂载可以提高生产环境性能

## 开发工作流 (Development Workflow)

```bash
# 1. 启动开发环境
NODE_ENV=development docker compose up

# 2. 在另一个终端运行数据库操作
docker compose exec app pnpm prisma db push

# 3. 查看实时日志
docker compose logs -f app worker

# 4. 代码更改会自动热重载（开发模式）

# 5. 完成后停止服务
docker compose down
```
