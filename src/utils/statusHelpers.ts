import type { OrderStatus } from '@/types'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  SUBMITTED:  'Submitted',
  RECEIVED:   'Received',
  PROCESSING: 'Processing',
  COMPLETED:  'Ready for Pickup',
  PICKED_UP:  'Picked Up',
  CANCELLED:  'Cancelled',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  SUBMITTED:  'bg-blue-100 text-blue-800',
  RECEIVED:   'bg-indigo-100 text-indigo-800',
  PROCESSING: 'bg-amber-100 text-amber-800',
  COMPLETED:  'bg-green-100 text-green-800',
  PICKED_UP:  'bg-gray-100 text-gray-600',
  CANCELLED:  'bg-red-100 text-red-700',
}

export const STATUS_STEPS: OrderStatus[] = [
  'SUBMITTED',
  'RECEIVED',
  'PROCESSING',
  'COMPLETED',
  'PICKED_UP',
]

export function getStatusStep(status: OrderStatus): number {
  const idx = STATUS_STEPS.indexOf(status)
  return idx === -1 ? 0 : idx
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === 'PICKED_UP' || status === 'CANCELLED'
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const validTransitions: Partial<Record<OrderStatus, OrderStatus>> = {
    SUBMITTED:  'RECEIVED',
    RECEIVED:   'PROCESSING',
    PROCESSING: 'COMPLETED',
    COMPLETED:  'PICKED_UP',
  }
  return validTransitions[status] ?? null
}
