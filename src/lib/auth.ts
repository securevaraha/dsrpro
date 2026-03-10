import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export type UserRole = 'admin' | 'agent' | 'vendor'

export interface AuthUser {
  userId: string
  email: string
  role: UserRole
  sessionId: string
}

/**
 * Verifies the JWT from the request cookie and returns the decoded user.
 * Returns null if token is missing or invalid.
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  try {
    const token = request.cookies.get('token')?.value
    if (!token || !process.env.JWT_SECRET) return null
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
    if (!decoded.userId || !decoded.role) return null
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    }
  } catch {
    return null
  }
}

/**
 * Require authentication. Returns the user or an error response.
 */
export function requireAuth(request: NextRequest): AuthUser | NextResponse {
  const user = getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user
}

/**
 * Require authentication + one of the allowed roles.
 * Returns the user or an error response.
 */
export function requireRole(request: NextRequest, allowedRoles: UserRole[]): AuthUser | NextResponse {
  const result = requireAuth(request)
  if (result instanceof NextResponse) return result
  if (!allowedRoles.includes(result.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  return result
}

/**
 * Helper to check if the result is an error response (use in routes).
 * Usage:
 *   const auth = requireRole(request, ['admin'])
 *   if (isErrorResponse(auth)) return auth
 *   // auth is now AuthUser
 */
export function isErrorResponse(result: AuthUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
