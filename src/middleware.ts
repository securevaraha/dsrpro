import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_ROUTES = ['/', '/auth/signin', '/auth/signup']
const PUBLIC_API_ROUTES = ['/api/auth/signin', '/api/auth/signup']

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Allow public API routes without auth
    if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    if (PUBLIC_ROUTES.includes(pathname)) {
      // If user is already authenticated and visiting auth pages, redirect to dashboard
      const token = request.cookies.get('token')?.value
      if (token && (pathname === '/auth/signin' || pathname === '/auth/signup')) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET)
          await jwtVerify(token, secret)
          return NextResponse.redirect(new URL('/dashboard', request.url))
        } catch {
          // Token invalid — let them visit the auth page
        }
      }
      return NextResponse.next()
    }

    // Protected routes — verify the JWT
    const token = request.cookies.get('token')?.value
    const isApiRoute = pathname.startsWith('/api/')

    if (!token) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    // Attach user info to headers for downstream API routes
    const response = NextResponse.next()
    response.headers.set('x-user-id', String(payload.userId))
    response.headers.set('x-user-role', String(payload.role))
    response.headers.set('x-user-email', String(payload.email))
    return response
  } catch (error) {
    const { pathname } = request.nextUrl
    const isApiRoute = pathname.startsWith('/api/')

    if (isApiRoute) {
      return NextResponse.json({ error: 'Authentication expired' }, { status: 401 })
    }

    // Token expired or invalid — clear it and redirect to signin
    const response = NextResponse.redirect(new URL('/auth/signin', request.url))
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    })
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/api/:path*']
}