import React, { useState } from 'react'
import {
  LayoutDashboard, PlusCircle, Package, Clock, Bell, User, QrCode,
} from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useUnreadCount } from '@/hooks/useUnreadCount'

const NAV_ITEMS = [
  { to: '/dashboard',        label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/submit',           label: 'Submit',       icon: PlusCircle },
  { to: '/current',          label: 'Current',      icon: Package },
  { to: '/history',          label: 'History',      icon: Clock },
  { to: '/notifications',    label: 'Notifications',icon: Bell },
  { to: '/my-bag',           label: 'My Bag QR',    icon: QrCode },
  { to: '/profile',          label: 'Profile',      icon: User },
]

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const unreadCount = useUnreadCount()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopBar onMenuClick={() => setSidebarOpen(true)} unreadCount={unreadCount} />
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
