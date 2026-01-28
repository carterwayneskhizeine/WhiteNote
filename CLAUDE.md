# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ 开发环境要求

**本项目使用 Docker Compose 进行开发和部署。**

- ✅ **使用方式**：通过 Docker Compose 启动所有服务
- ❌ **不支持**：本地直接使用 `pnpm dev` 或 `pnpm worker`
- 📖 **详细指南**：参见 [DOCKER.md](d:\Code\whitenote\DOCKER.md)

快速启动：
```bash
cp .env.dev.example .env
NODE_ENV=development docker compose up app worker
```

## Project Overview

WhiteNote is a collaborative social media platform with AI-enhanced features, combining Twitter/X-style microblogging with workspace organization and real-time collaboration. The application uses a multi-service architecture with Next.js (App Router), PostgreSQL with Prisma, Socket.IO for real-time updates, and RAGFlow integration for AI capabilities.

## Development Commands

**重要：本项目使用 Docker 进行开发和部署，不再支持本地 pnpm 直接运行。**

### Starting Development (Docker)

```bash
# 复制环境变量配置
cp .env.dev.example .env

# 启动开发环境（带热重载）
NODE_ENV=development docker compose up app worker

# 或者后台运行
NODE_ENV=development docker compose up -d app worker
```

### Starting Production (Docker)

```bash
# 启动生产环境（优化构建）
NODE_ENV=production docker compose up -d app worker
```

### Database Operations (Docker)

```bash
# 推送 schema 变更
docker compose exec app pnpm prisma db push

# 运行种子数据脚本（创建内置模板和 AI 命令）
docker compose exec app pnpm prisma db seed

# 打开 Prisma Studio 数据库 UI
docker compose exec app pnpm prisma studio

# 生成 Prisma Client（通常自动运行）
docker compose exec app pnpm prisma generate

# 完全重置数据库（删除所有数据）
docker compose exec postgres psql -U myuser -d postgres -c "DROP DATABASE IF EXISTS whitenote;"
docker compose exec postgres psql -U myuser -d postgres -c "CREATE DATABASE whitenote;"
docker compose exec app pnpm prisma db push
docker compose exec app pnpm prisma db seed
```

### Other Commands (Docker)

```bash
# 仅种子 AI 命令
docker compose exec app pnpm seed:ai-commands

# 运行 ESLint
docker compose exec app pnpm lint

# 查看日志
docker compose logs -f app
docker compose logs -f worker

# 进入容器
docker compose exec app sh

# 重启服务
docker compose restart app worker
```

## Architecture

### Multi-Service Structure

The application runs on Docker Compose with the following services:

1. **app**: Next.js main web server (port 3005)
   - Development mode: `pnpm build` + `pnpm dev` (with hot reload)
   - Production mode: `pnpm start`
2. **worker**: Background job processor (`scripts/worker.ts`)
   - Handles scheduled tasks and background jobs
3. **postgres**: PostgreSQL 16 database (port 5925)
4. **redis**: Redis cache and queue (port 4338)
5. **pgadmin**: PostgreSQL management UI (port 5050)
6. **Socket.IO Server**: Integrated into the app service for real-time messaging

### Workspace-Centric Design

- Users can create multiple workspaces
- Each workspace has independent RAGFlow AI configurations
- Messages are scoped to workspaces
- AI features (auto-tagging, daily briefings) are configured per workspace
- Default workspace is automatically created for new users

### AI Integration Layers

The platform has four AI integration layers:

1. **Detection Layer**: AI mention detection (`@goldierill` or `@ragflow`) in messages triggers automated responses
2. **RAG Layer**: Knowledge base chat integration with RAGFlow
3. **Command Layer**: Pre-defined AI commands stored in database (seeded via `prisma/seed-ai-commands.ts`)
4. **Automated Layer**: Scheduled tasks for auto-tagging and daily briefings

### Real-Time Features

Socket.IO integration (`src/lib/socket/`) handles:
- Message creation, editing, and deletion broadcasts
- Comment and reply notifications
- Real-time collaboration features

### Content Management

- **TipTap Editor**: Rich text editing with markdown support (`src/components/InputMachine/`)
- **Media Handling**: Custom upload API supports images (jpg, png, webp) and videos (mp4, mov) with 100MB limit
- **Message Versioning**: Edit history tracking in database
- **Tag System**: Auto-tagging via AI, manual tags
- **Social Features**: Retweets/quotes, nested comments, starring, pinning

### Background Job Processing

BullMQ with Redis (`src/lib/queue/`) for:
- Scheduled daily briefings
- AI-powered auto-tagging
- Async media processing

## Key Directories

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, messages, media)
│   ├── page.tsx           # 首页 (Home page)
│   ├── status/[id]/       # 帖子详情页面 (Message detail page)
│   │   ├── page.tsx       # 帖子详情页
│   │   ├── reply/page.tsx # 移动端回复页面 (Mobile reply page)
│   │   └── comment/[commentId]/
│   │       ├── page.tsx   # 评论详情页 (Comment detail page)
│   │       └── reply/page.tsx # 移动端评论回复页面 (Mobile comment reply page)
│   ├── retweet/page.tsx   # 移动端转发页面 (Mobile retweet page)
│   ├── share/[id]/        # 公开分享页面 (Public share page)
│   └── [workspace]/       # Workspace-scoped pages
├── components/            # React components
│   ├── InputMachine.tsx   # 主页输入组件 (Main input component with TipTap editor)
│   ├── ReplyDialog.tsx    # 回复对话框组件 (Reply dialog component)
│   ├── RetweetDialog.tsx  # 转发对话框组件 (Retweet/quote dialog component)
│   ├── ShareDialog.tsx    # 分享对话框组件 (Share dialog component)
│   ├── CompactReplyInput.tsx # 紧凑回复输入组件 (Compact reply input component)
│   ├── CommentsList.tsx   # 评论列表组件 (Comments list component)
│   ├── MessageCard.tsx    # 主消息卡片组件 (Main message card component)
│   ├── QuotedMessageCard.tsx # 引用消息卡片组件 (Quoted message card component)
│   ├── ActionRow.tsx      # 操作按钮行组件 (Action buttons row component)
│   ├── TipTapViewer.tsx   # 富文本查看器组件 (Rich text viewer component)
│   ├── MediaGrid.tsx      # 媒体网格显示组件 (Media grid display component)
│   ├── ImageLightbox.tsx  # 图片灯箱组件 (Image lightbox component)
│   ├── GoldieAvatar.tsx   # AI/用户头像组件 (AI/User avatar component)
│   ├── layout/            # 布局组件 (Layout components)
│   │   ├── MainLayout.tsx # 主布局组件
│   │   ├── LeftSidebar.tsx # 左侧边栏 (Desktop left sidebar)
│   │   ├── RightSidebar.tsx # 右侧边栏 (Desktop right sidebar with search)
│   │   └── MobileNav.tsx   # 移动端导航 (Mobile navigation)
│   ├── InputMachine/      # TipTap editor with AI integration
│   └── MessagesList/      # Message display with real-time updates
├── lib/
│   ├── socket/           # Socket.IO server configuration
│   ├── queue/            # BullMQ job queue setup
│   └── ai/               # RAGFlow and AI service integrations
├── store/                # Zustand state management
├── hooks/                # Custom React hooks
│   ├── use-share.ts      # 分享功能 Hook (Share functionality hook)
│   └── use-mobile.ts     # 移动端检测 Hook (Mobile detection hook)
└── types/                # TypeScript type definitions
prisma/
├── schema.prisma         # Database schema
└── seed-ai-commands.ts   # Seed script for AI commands
scripts/
├── worker.ts             # Background worker process
HttpAPIRAGFlow/           # RAGFlow API automation scripts and documentation
```

## Database Schema Patterns

- **Multi-tenant design**: Most models have `workspaceId` or `userId` relations
- **Cascade deletion**: User/account/session deletions cascade properly
- **Message versioning**: Edit history preserved for auditing
- **AI Command registry**: `AICommand` model stores predefined prompts
- **Social relationships**: `Retweet` model tracks quote/retweet relationships
- **Media metadata**: `Media` model tracks file uploads separately from messages

## Important Constraints

- **Docker 必需**：本项目使用 Docker Compose 进行开发和部署，不支持本地 pnpm 直接运行
- 所有服务（app、worker、postgres、redis）通过 Docker Compose 管理
- 数据库必须运行种子脚本才能使用 AI 命令功能
- RAGFlow 集成需要为每个 workspace 配置外部服务
- 详见 [DOCKER.md](d:\Code\whitenote\DOCKER.md) 了解完整的 Docker 使用指南
