'use client'
import { X, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  images: { url: string; fileName: string }[]
  initialIndex?: number
}

export function ImagePreviewModal({ isOpen, onClose, images, initialIndex = 0 }: ImagePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isOpen])

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % images.length)
  }, [images.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') goNext()
      if (event.key === 'ArrowLeft') goPrev()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, goNext, goPrev])

  if (!isOpen || images.length === 0) return null

  const current = images[currentIndex] || images[0]

  const handleDownload = () => {
    const downloadHref = current.url.includes('/api/upload/file?')
      ? `${current.url}${current.url.includes('?') ? '&' : '?'}download=1`
      : current.url

    const link = document.createElement('a')
    link.href = downloadHref
    link.download = current.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Eye className="h-5 w-5" />
            <span className="text-sm font-medium truncate">{current.fileName}</span>
            {images.length > 1 && (
              <span className="text-xs text-white/60 ml-2">{currentIndex + 1} / {images.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Download">
              <Download className="h-5 w-5" />
            </button>
            <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors" title="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl relative">
          <img
            src={current.url}
            alt={current.fileName}
            className="w-full h-auto max-h-[80vh] object-contain"
            style={{ maxHeight: 'calc(90vh - 80px)' }}
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded border-2 overflow-hidden transition-all ${idx === currentIndex ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-100'}`}
              >
                <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-white/70 text-sm mt-3">
          {images.length > 1 ? 'Use ← → arrows to navigate • ' : ''}Press ESC or click outside to close
        </p>
      </div>
    </div>
  )
}
