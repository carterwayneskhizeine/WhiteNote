import { auth } from "./auth"

/**
 * Authentication error for unauthorized access
 */
export class AuthError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message)
    this.name = "AuthError"
  }
}

/**
 * Ensure the user is authenticated and return the session
 * Throws AuthError if not authenticated
 *
 * @returns The authenticated session with user data
 * @throws {AuthError} If user is not authenticated
 *
 * @example
 * ```ts
 * try {
 *   const session = await requireAuth()
 *   const userId = session.user.id
 *   // ... proceed with authenticated logic
 * } catch (error) {
 *   if (error instanceof AuthError) {
 *     return Response.json({ error: error.message }, { status: 401 })
 *   }
 *   throw error
 * }
 * ```
 */
export async function requireAuth() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AuthError("Unauthorized")
  }

  return session
}

/**
 * Ensure the user is authenticated and return the session
 * Returns a 401 Response if not authenticated (for convenience)
 *
 * @returns The authenticated session or null
 *
 * @example
 * ```ts
 * const session = await requireAuthOrResponse()
 * if (!session) {
 *   return Response.json({ error: "Unauthorized" }, { status: 401 })
 * }
 * const userId = session.user.id
 * ```
 */
export async function requireAuthOrResponse() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  return session
}

/**
 * Helper to get user ID from session or throw AuthError
 *
 * @returns The authenticated user's ID
 * @throws {AuthError} If user is not authenticated
 *
 * @example
 * ```ts
 * try {
 *   const userId = await requireUserId()
 *   // ... proceed with userId
 * } catch (error) {
 *   if (error instanceof AuthError) {
 *     return Response.json({ error: error.message }, { status: 401 })
 *   }
 *   throw error
 * }
 * ```
 */
export async function requireUserId(): Promise<string> {
  const session = await requireAuth()
  return session.user.id
}
