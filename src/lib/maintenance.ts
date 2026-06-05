import { NextResponse } from 'next/server'

export function isMaintenanceMode() {
  return process.env.MAINTENANCE_MODE === 'true'
}

export function maintenanceResponse() {
  return NextResponse.json(
    { error: 'Service is under maintenance. Please try again later.' },
    { status: 503 }
  )
}
