import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

interface SidebarProps {
  items: NavItem[]
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ items, open = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-56 bg-primary text-white flex flex-col',
          'transform transition-transform duration-200 ease-in-out',
          'lg:static lg:translate-x-0 lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-14 flex items-center px-4 font-bold text-lg border-b border-white/10">
          UNi LaunDRY
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-0.5 px-2">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/dashboard' || to === '/staff' || to === '/admin'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
