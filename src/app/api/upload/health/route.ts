import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
    
    return NextResponse.json({
      status: 'ok',
      uploadService: hasVercelBlob ? 'vercel-blob' : 'local-fallback',
      configured: hasVercelBlob,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}