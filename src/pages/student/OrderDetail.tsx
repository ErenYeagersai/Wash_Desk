import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { StatusBadge, CardSkeleton, Card } from '@/components/ui'
import { formatDateTime } from '@/utils/formatDate'
import { ArrowLeft } from 'lucide-react'
import type { LaundryOrder } from '@/types'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<LaundryOrder | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    supabase
      .from('laundry_orders')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => setOrder(data ?? null))
  }, [id])

  return (
    <StudentLayout>
      <div className="max-w-lg mx-auto">
        <Link to="/history" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <h1 className="text-xl font-bold text-gray-900 mb-4">Order Detail</h1>

        {order === undefined ? (
          <CardSkeleton />
        ) : order === null ? (
          <Card>Order not found.</Card>
        ) : (
          <Card className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">{order.order_id}</p>
                <p className="text-sm text-gray-500">{order.clothes_count} clothes</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Submitted</dt>
                <dd className="text-gray-800 font-medium">{formatDateTime(order.submitted_at)}</dd>
              </div>
              {order.received_at && (
                <div>
                  <dt className="text-gray-500">Received</dt>
                  <dd className="text-gray-800 font-medium">{formatDateTime(order.received_at)}</dd>
                </div>
              )}
              {order.processing_at && (
                <div>
                  <dt className="text-gray-500">Processing</dt>
                  <dd className="text-gray-800 font-medium">{formatDateTime(order.processing_at)}</dd>
                </div>
              )}
              {order.completed_at && (
                <div>
                  <dt className="text-gray-500">Completed</dt>
                  <dd className="text-gray-800 font-medium">{formatDateTime(order.completed_at)}</dd>
                </div>
              )}
              {order.picked_up_at && (
                <div>
                  <dt className="text-gray-500">Picked Up</dt>
                  <dd className="text-gray-800 font-medium">{formatDateTime(order.picked_up_at)}</dd>
                </div>
              )}
            </dl>

            {order.notes && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">
                "{order.notes}"
              </div>
            )}
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
