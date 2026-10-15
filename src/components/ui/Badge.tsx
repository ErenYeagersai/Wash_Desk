import { cn } from '@/utils/cn'
import { STATUS_COLORS, STATUS_LABELS } from '@/utils/statusHelpers'
import type { OrderStatus } from '@/types'

interface BadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

interface RoleBadgeProps {
  role: string
  className?: string
}

const ROLE_COLORS: Record<string, string> = {
  student: 'bg-blue-50 text-blue-700',
  staff:   'bg-purple-50 text-purple-700',
  admin:   'bg-amber-50 text-amber-700',
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        ROLE_COLORS[role] ?? 'bg-gray-100 text-gray-600',
        className,
      )}
    >
      {role}
    </span>
  )
}
