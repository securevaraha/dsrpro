import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth/signin', '/auth/signup']
    
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next()
    }

    // Check for authentication token
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*']
}