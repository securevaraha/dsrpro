import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

interface OptimisticOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
  successMessage?: string
  errorMessage?: string
}

export function useOptimistic<T>(
  initialData: T[],
  options: OptimisticOptions<T> = {}
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)

  const optimisticAdd = useCallback(async (
    newItem: T,
    apiCall: () => Promise<T>
  ) => {
    // Optimistically add item
    setData(prev => [...prev, newItem])
    setLoading(true)

    try {
      const result = await apiCall()
      // Replace optimistic item with real data
      setData(prev => prev.map(item => 
        item === newItem ? result : item
      ))
      
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      options.onSuccess?.(result)
    } catch (error) {
      // Revert optimistic update
      setData(prev => prev.filter(item => item !== newItem))
      
      if (options.errorMessage) {
        toast.error(options.errorMessage)
      }
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [options])

  const optimisticUpdate = useCallback(async (
    id: string | number,
    updates: Partial<T>,
    apiCall: () => Promise<T>
  ) => {
    // Store original item for rollback
    const originalItem = data.find((item: any) => item.id === id || item._id === id)
    if (!originalItem) return

    // Optimistically update item
    setData(prev => prev.map(item => 
      (item as any).id === id || (item as any)._id === id 
        ? { ...item, ...updates } 
        : item
    ))
    setLoading(true)

    try {
      const result = await apiCall()
      // Replace with real data
      setData(prev => prev.map(item => 
        (item as any).id === id || (item as any)._id === id 
          ? result 
          : item
      ))
      
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      options.onSuccess?.(result)
    } catch (error) {
      // Revert to original
      setData(prev => prev.map(item => 
        (item as any).id === id || (item as any)._id === id 
          ? originalItem 
          : item
      ))
      
      if (options.errorMessage) {
        toast.error(options.errorMessage)
      }
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [data, options])

  const optimisticDelete = useCallback(async (
    id: string | number,
    apiCall: () => Promise<void>
  ) => {
    // Store original item for rollback
    const originalItem = data.find((item: any) => item.id === id || item._id === id)
    if (!originalItem) return

    // Optimistically remove item
    setData(prev => prev.filter(item => 
      (item as any).id !== id && (item as any)._id !== id
    ))
    setLoading(true)

    try {
      await apiCall()
      
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      options.onSuccess?.(originalItem)
    } catch (error) {
      // Restore item
      setData(prev => [...prev, originalItem])
      
      if (options.errorMessage) {
        toast.error(options.errorMessage)
      }
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [data, options])

  return {
    data,
    setData,
    loading,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete
  }
}