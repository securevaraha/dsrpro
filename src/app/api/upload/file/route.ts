import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    const rawUrl = request.nextUrl.searchParams.get('url')
    const download = request.nextUrl.searchParams.get('download') === '1'

    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing file url' }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN environment variable is not set' }, { status: 500 })
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid file url' }, { status: 400 })
    }

    // Prevent open proxy behavior. Only allow Vercel Blob hosts.
    if (targetUrl.protocol !== 'https:' || !targetUrl.hostname.endsWith('.blob.vercel-storage.com')) {
      return NextResponse.json({ error: 'Unsupported file host' }, { status: 400 })
    }

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    })

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Unable to fetch file' }, { status: upstream.status || 500 })
    }

    const fileName = decodeURIComponent(targetUrl.pathname.split('/').pop() || 'file')
    const safeFileName = fileName.replace(/"/g, '')
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

    const headers = new Headers()
    headers.set('content-type', contentType)
    headers.set('cache-control', 'private, no-store')
    headers.set(
      'content-disposition',
      download ? `attachment; filename="${safeFileName}"` : `inline; filename="${safeFileName}"`
    )

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'File proxy failed' }, { status: 500 })
  }
}
