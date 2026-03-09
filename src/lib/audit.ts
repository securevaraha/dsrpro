import jwt from 'jsonwebtoken'

export const getCurrentUserId = (request: any): string | null => {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return null
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded.userId
  } catch (error) {
    return null
  }
}

export const addAuditFields = (data: any, userId: string | null, isUpdate = false) => {
  if (!userId) return data
  
  if (isUpdate) {
    return {
      ...data,
      updatedBy: userId
    }
  } else {
    return {
      ...data,
      createdBy: userId,
      updatedBy: userId
    }
  }
}