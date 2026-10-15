import { Bell, LogOut, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui'

interface TopBarProps {
  onMenuClick?: () => void
  unreadCount?: number
}

export function TopBar({ onMenuClick, unreadCount = 0 }: TopBarProps) {
  const { profile, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link to="/" className="flex items-center gap-2 font-bold text-primary text-lg">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-primary text-white text-sm font-bold">L</span>
            UNi LaunDRY
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {profile?.role === 'student' && (
            <Link
              to="/notifications"
              className="relative p-2 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <span className="hidden sm:block text-sm text-gray-700 font-medium">
            {profile?.name?.split(' ')[0]}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut} leftIcon={<LogOut className="w-4 h-4" />}>
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
