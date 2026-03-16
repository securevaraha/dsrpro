import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { uploadToLocal } from '@/lib/uploadFallback'

export async function POST(request: NextRequest) {
  try {
    // Check if blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN environment variable is not set')
      return NextResponse.json({ error: 'File upload service not configured' }, { status: 500 })
    }

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
    
    // Try Vercel Blob first, fallback to local storage
    let uploadResult
    
    try {
      // Upload to Vercel Blob
      const blob = await put(fileName, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      
      uploadResult = {
        url: blob.url,
        fileName: file.name,
        size: file.size,
        type: file.type
      }
      
      console.log('Vercel Blob upload successful:', blob.url)
    } catch (blobError: any) {
      console.warn('Vercel Blob upload failed, trying local fallback:', blobError?.message || blobError)
      
      // Fallback to local storage
      const localResult = await uploadToLocal(file)
      
      uploadResult = {
        url: localResult.url,
        fileName: file.name,
        size: file.size,
        type: file.type
      }
      
      console.log('Local upload successful:', localResult.url)
    }
    
    return NextResponse.json(uploadResult)
  } catch (error: any) {
    console.error('Upload error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    
    // Return more specific error messages
    if (error?.message?.includes('token')) {
      return NextResponse.json({ error: 'Invalid upload token configuration' }, { status: 500 })
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