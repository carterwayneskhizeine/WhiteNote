const API_BASE = "/api"

/**
 * 用户注册
 */
export async function register(data: {
  name?: string
  email: string
  password: string
}) {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return { error: result.error || "注册失败" }
    }

    return { data: result.data }
  } catch (error) {
    console.error("Register error:", error)
    return { error: "网络错误，请重试" }
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`)

    const result = await response.json()

    if (!response.ok) {
      return { error: result.error || "获取用户信息失败" }
    }

    return { data: result.data }
  } catch (error) {
    console.error("Get current user error:", error)
    return { error: "网络错误，请重试" }
  }
}

/**
 * 更新用户资料
 */
export async function updateProfile(data: {
  name?: string
  avatar?: string
}) {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      return { error: result.error || "更新资料失败" }
    }

    return { data: result.data }
  } catch (error) {
    console.error("Update profile error:", error)
    return { error: "网络错误，请重试" }
  }
}

export const authApi = {
  register,
  getCurrentUser,
  updateProfile,
}
