import React, { useState } from 'react'
import { LayoutDashboard, QrCode, ClipboardList } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const NAV_ITEMS = [
  { to: '/staff',         label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/staff/scan',    label: 'Scan QR',    icon: QrCode },
  { to: '/staff/orders',  label: 'All Orders', icon: ClipboardList },
]

export function StaffLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          items={NAV_ITEMS}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
