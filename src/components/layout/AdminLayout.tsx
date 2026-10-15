import React, { useState } from 'react'
import { LayoutDashboard, Users, Package, ClipboardList, Settings, AlertTriangle } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const NAV_ITEMS = [
  { to: '/admin',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/admin/orders',   label: 'Orders',     icon: Package },
  { to: '/admin/delayed',  label: 'Delayed',    icon: AlertTriangle },
  { to: '/admin/users',    label: 'Users',      icon: Users },
  { to: '/admin/logs',     label: 'Audit Logs', icon: ClipboardList },
  { to: '/admin/settings', label: 'Settings',   icon: Settings },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
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
