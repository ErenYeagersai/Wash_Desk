import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { StatusBadge, CardSkeleton, Card } from '@/components/ui'
import { STATUS_STEPS, getStatusStep } from '@/utils/statusHelpers'
import { formatDateTime } from '@/utils/formatDate'
import { Package } from 'lucide-react'
import type { LaundryOrder } from '@/types'

export default function CurrentLaundry() {
  const { user } = useAuth()
  const [order, setOrder] = useState<LaundryOrder | null | undefined>(undefined)

  useEffect(() => {
    if (!user) return

    async function fetchActive() {
      const { data } = await supabase
        .from('laundry_orders')
        .select('*')
        .eq('student_id', user!.id)
        .not('status', 'in', '("PICKED_UP","CANCELLED")')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setOrder(data ?? null)
    }
    fetchActive()

    const channel = supabase
      .channel('active-order')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'laundry_orders',
        filter: `student_id=eq.${user.id}`,
      }, payload => {
        setOrder(payload.new as LaundryOrder)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const statusTimestamps: Partial<Record<string, string | null>> = order ? {
    SUBMITTED:  order.submitted_at,
    RECEIVED:   order.received_at,
    PROCESSING: order.processing_at,
    COMPLETED:  order.completed_at,
    PICKED_UP:  order.picked_up_at,
  } : {}

  const currentStep = order ? getStatusStep(order.status) : 0

  return (
    <StudentLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Current Laundry</h1>

        {order === undefined ? (
          <CardSkeleton />
        ) : order === null ? (
          <Card className="text-center py-10">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No active laundry order.</p>
            <Link to="/submit" className="text-sm text-primary font-medium mt-2 inline-block hover:underline">
              Submit a bag
            </Link>
          </Card>
        ) : (
          <Card>
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500">Order</p>
                <p className="font-bold text-gray-900">{order.order_id}</p>
                <p className="text-sm text-gray-500">{order.clothes_count} clothes</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Progress stepper */}
            <ol className="relative ml-3 space-y-0">
              {STATUS_STEPS.map((step, idx) => {
                const done    = idx < currentStep
                const current = idx === currentStep
                return (
                  <li key={step} className={`relative flex gap-4 pb-6 last:pb-0 ${idx < STATUS_STEPS.length - 1 ? 'before:absolute before:left-3 before:top-7 before:h-full before:w-0.5 before:bg-gray-200' : ''}`}>
                    <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${done ? 'bg-green-500 border-green-500 text-white' : current ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${current ? 'text-primary' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                        {step.replace('_', ' ')}
                      </p>
                      {statusTimestamps[step] && (
                        <p className="text-xs text-gray-400">{formatDateTime(statusTimestamps[step])}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>

            {order.notes && (
              <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 italic">
                "{order.notes}"
              </p>
            )}
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
