import { toast } from 'react-hot-toast'

export const handleApiError = (error: any) => {
  if (error.response?.data?.message) {
    toast.error(error.response.data.message)
  } else if (error.message) {
    toast.error(error.message)
  } else {
    toast.error('An unexpected error occurred')
  }
}

export const handleNetworkError = () => {
  toast.error('Network error. Please check your connection.')
}

export const handleValidationError = (field: string) => {
  toast.error(`${field} is required`)
}

export const handleAuthError = () => {
  toast.error('Authentication failed. Please login again.')
  window.location.href = '/auth/signin'
}

export const handlePermissionError = () => {
  toast.error('You do not have permission to perform this action')
}