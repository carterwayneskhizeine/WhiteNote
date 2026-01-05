# 前端 UI 组件与布局文档 (Status Report)

**日期**: 2026-01-04
**状态**: ✅ 基础布局完成 (Layout Foundation Complete)
**风格**: X (Twitter) "Lights Out" Dark Mode Style

## 1. 核心布局 (Core Layout)

前端采用了 `100vh` 全屏高度的响应式三栏布局。

### 1.1 `MainLayout.tsx`
整个应用的容器。
- **Container**: `max-w-[1300px]` 居中显示，模仿 X 的宽屏体验。
- **Grid**: Flexbox 布局 (Left - Main - Right)。
- **Symmetry**: 中间主栏 (`max-w-[600px]`) 使用 `border-x` 确保左右两侧均有分割线。

### 1.2 `LeftSidebar.tsx` (Desktop Navigation)
左侧导航栏，宽 `275px`。
- **Logo**: 纯圆白底 Logo，去除了文字。
- **Navigation**: 高亮的图标 + 文字，选中态加粗。图标尺寸优化为 `h-7 w-7`。
- **Post Button**: 大尺寸圆角按钮 (Pill Shape)，白底黑字 (`bg-foreground text-background`)，在深色模式下极其醒目。
- **User Profile**: 底部固定的用户信息栏，支持 `...` 更多操作。

### 1.3 `RightSidebar.tsx` (Context & Discovery)
右侧辅助栏，宽 `350px`。
- **Search**: 顶部固定搜索框，圆角矩形，深灰背景 (`bg-input`)，聚焦时边框变蓝 (`ring-primary`)。
- **Subscribe Card**: 模仿 X Premium 订阅卡片，黑色背景 + 醒目的订阅按钮。
- **Trends**: "What's happening" 列表，展示热门标签和推文数量。

### 1.4 `MobileNav.tsx` (Mobile Navigation System)
移动端 (< 1024px) 全局导航系统，高度还原 X App 布局。
- **Top Bar**: 
  - Left: 用户头像，点击触发 `Sheet` 侧滑菜单。
  - Center: 居中极简 Logo。
  - Right: 占位符 (保持平衡)。
- **Bottom Bar**: 
  - 底部固定导航栏 (`fixed bottom-0`)。
  - 包含 Home, Explore, Notifications, Messages 四个核心入口。
  - 支持 `backdrop-blur` 和 `active` 状态高亮。
- **FAB**: 右下角悬浮发帖按钮 (`bg-primary` 圆形按钮)。
- **Drawer**: 复用 `LeftSidebar` 组件，作为个人中心入口。在 Mobile 模式下隐藏了重复的 "Post" 按钮。

---

## 2. 页面结构 (Page Structure)

### 2.1 `Home` (/app/page.tsx)
- **Header**: Tab 切换栏 ("For you" | "Following")。
    - 采用玻璃拟态 (`backdrop-blur`)。
    - "For you" 下方有活跃蓝条指示器。
- **InputMachine**: 
    - 集成 `Tiptap` 编辑器。
    - 底部工具栏 icon (Image, Smile, Paperclip) 使用蓝色主色调。
    - 发送按钮为白底黑字。
    - **Fix**: 解决了 `immediatelyRender` 导致的 SSR 水合错误。
- **Timeline**: 骨架屏占位符，模拟推文加载状态。

---

## 3. 样式系统 (Design System)

### 3.1 调色板 (Color Palette)
基于 `globals.css` 的 CSS Variables，完全复刻 X 的深色模式。

| Variable | Value | Description |
| :--- | :--- | :--- |
| `--background` | `#000000` | 纯黑背景 |
| `--foreground` | `#e7e9ea` | 灰白文字 (非纯白，减少刺眼) |
| `--border` | `#2f3336` | 深灰边框 |
| `--primary` | `#1d9bf0` | Twitter Blue (用于图标、链接) |
| `--input` | `#202327` | 输入框/搜索框背景 |
| `--secondary` | `#16181c` | 悬停态背景 |

### 3.2 组件库 (Shadcn UI)
已集成并定制以下组件：
- `Button`: 支持 `ghost`, `default` (primary color), 及自定义的 Pill Shape。
- `Avatar`: 圆形头像。
- `Sheet`: 移动端侧滑菜单。
- `Card`: 去除默认阴影，使用 border 描边的卡片风格。
- `Input`: 极简风格输入框。

---

## 4. 下一步计划 (Next Steps)
- [ ] **Data Binding**: 将 `InputMachine` 和 Timeline 对接后端 API (`/api/messages`)。
- [ ] **Auth Integration**: 在 Sidebar 展示真实登录用户信息。
- [ ] **Interactions**: 实现点赞、回复、转发的 UI 交互。
