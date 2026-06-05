import MaintenancePage from '@/app/maintenance/page'

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'

  if (isMaintenanceMode) {
    return <MaintenancePage />
  }

  return <>{children}</>
}
