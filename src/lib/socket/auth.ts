import { decode } from "next-auth/jwt"

interface UserData {
  userId: string
  email: string
  name?: string | null
  avatar?: string | null
}

/**
 * Verify NextAuth session directly using next-auth/jwt decode
 * This avoids internal HTTP calls and works within the Socket.IO middleware
 */
export async function verifySessionToken(token: string, salt: string): Promise<UserData | null> {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET

  if (!secret) {
    console.error("[Socket] AUTH_SECRET is missing")
    return null
  }

  try {
    // console.log("[Socket] Verifying token with salt:", salt)
    
    const decoded = await decode({
      token,
      secret,
      salt,
    })

    if (!decoded) {
      console.warn("[Socket] Token decoding returned null")
      return null
    }

    // console.log("[Socket] Token verified successfully for user:", decoded.sub)

    // NextAuth v5 typically stores userId in 'sub'
    return {
      userId: decoded.sub as string,
      email: decoded.email as string,
      name: decoded.name as string | null,
      avatar: decoded.picture as string | null,
    }
  } catch (error) {
    console.error("[Socket] Failed to verify token:", error)
    return null
  }
}