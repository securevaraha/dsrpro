import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAuth, isErrorResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Require authentication before allowing any upload
    const auth = requireAuth(request)
    if (isErrorResponse(auth)) return auth

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type)
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 })
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `receipts/${timestamp}-${cleanFileName}`
    
    console.log('Generated filename:', fileName)
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN environment variable is not set' }, { status: 500 })
    }

    const uploadAccess = process.env.BLOB_UPLOAD_ACCESS === 'public' ? 'public' : 'private'

    // Upload to Vercel Blob only.
    const blob = await put(fileName, file, {
      access: uploadAccess,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })

    console.log('Vercel Blob upload successful:', blob.url)

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error: any) {
    console.error('Upload error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    
    // Return more specific error messages
    if (error?.message?.includes('token') || error?.message?.includes('BLOB_READ_WRITE_TOKEN')) {
      return NextResponse.json({ error: 'Invalid upload token configuration' }, { status: 500 })
    }

    if (error?.message?.includes('Cannot use public access on a private store')) {
      return NextResponse.json({ error: 'Blob store is private. Set BLOB_UPLOAD_ACCESS=private or use a public Blob store token.' }, { status: 500 })
    }
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      return NextResponse.json({ error: 'Network error during upload' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
    }, { status: 500 })
  }
}