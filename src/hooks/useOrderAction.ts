import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { LaundryOrder, OrderStatus } from '@/types'

interface UseOrderActionResult {
  advance: (orderId: string, newStatus: OrderStatus) => Promise<LaundryOrder | null>
  loading: boolean
  error: string | null
}

const SUPABASE_ERROR_MAP: Record<string, string> = {
  'Invalid transition':         'This status change is not allowed.',
  'Forbidden':                  'You do not have permission to perform this action.',
  'Order not found':            'Order not found.',
  'Authentication required':    'You must be logged in.',
}

function mapError(message: string): string {
  for (const [key, friendly] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (message.includes(key)) return friendly
  }
  return 'Update failed. Please try again.'
}

export function useOrderAction(): UseOrderActionResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function advance(orderId: string, newStatus: OrderStatus): Promise<LaundryOrder | null> {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('advance_order_status', {
      p_order_id:   orderId,
      p_new_status: newStatus,
    })
    setLoading(false)
    if (rpcError) {
      setError(mapError(rpcError.message))
      return null
    }
    return data as LaundryOrder
  }

  return { advance, loading, error }
}
