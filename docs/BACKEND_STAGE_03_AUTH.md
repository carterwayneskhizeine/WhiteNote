# WhiteNote 2.5 后端开发指南 - Stage 3: 认证系统

> **前置文档**: [Stage 2: 数据库 Schema](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_02_DATABASE.md)  
> **下一步**: [Stage 4: Messages API](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_04_MESSAGES_API.md)

---

## 目标

使用 NextAuth.js 实现单用户认证系统，支持邮箱/密码登录。

---

## Step 1: 安装依赖

```bash
pnpm add next-auth@beta @auth/prisma-adapter bcryptjs
pnpm add -D @types/bcryptjs
```

---

## Step 2: 创建 NextAuth 配置

创建 `src/lib/auth.ts`：

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter"
import { compare } from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

---

## Step 3: 创建 Auth API Route

创建 `src/app/api/auth/[...nextauth]/route.ts`：

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

---

## Step 4: 扩展 Session 类型

创建 `src/types/next-auth.d.ts`：

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}
```

更新 `tsconfig.json`，确保包含类型：

```json
{
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/types/**/*.d.ts"]
}
```

---

## Step 5: 创建认证辅助函数

创建 `src/lib/auth-utils.ts`：

```typescript
import { auth } from "./auth"
import { prisma } from "./prisma"

/**
 * 获取当前登录用户 (用于 Server Components)
 */
export async function getCurrentUser() {
  const session = await auth()
  
  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
    },
  })

  return user
}

/**
 * 确保用户已登录 (用于 API Routes)
 * 未登录时抛出错误
 */
export async function requireAuth() {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  return session.user
}

/**
 * API 响应：未授权
 */
export function unauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401 }
  )
}
```

---

## Step 6: 创建 Auth 中间件

创建 `src/middleware.ts`：

```typescript
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth

  // 保护的路由
  const protectedRoutes = ["/", "/settings", "/graph"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  )

  // API 路由单独处理
  const isApiRoute = req.nextUrl.pathname.startsWith("/api")
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth")

  // 登录页面
  const isLoginPage = req.nextUrl.pathname === "/login"

  // 已登录用户访问登录页，重定向到首页
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // 未登录用户访问保护页面，重定向到登录页
  if (!isLoggedIn && isProtectedRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

---

## Step 7: 创建登录 API

创建 `src/app/api/auth/login/route.ts`：

```typescript
import { signIn } from "@/lib/auth"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return Response.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json(
      { error: "Invalid credentials" },
      { status: 401 }
    )
  }
}
```

---

## Step 8: 创建当前用户 API

创建 `src/app/api/auth/me/route.ts`：

```typescript
import { getCurrentUser } from "@/lib/auth-utils"

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401 }
    )
  }

  return Response.json({ user })
}
```

---

## 验证检查点

### 1. 测试登录

```bash
# 启动开发服务器
pnpm dev

# 使用 cURL 测试登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@whitenote.local","password":"admin123"}'
```

预期响应：
```json
{"success": true}
```

### 2. 测试获取当前用户

```bash
# 先获取 session cookie，然后测试
curl http://localhost:3000/api/auth/me \
  -H "Cookie: <session-cookie>"
```

---

## API 端点汇总

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth 核心端点 |
| `/api/auth/login` | POST | 自定义登录端点 |
| `/api/auth/me` | GET | 获取当前用户 |

---

## 下一步

完成认证系统后，继续 [Stage 4: Messages API](file:///d:/Code/WhiteNote/docs/BACKEND_STAGE_04_MESSAGES_API.md)。
