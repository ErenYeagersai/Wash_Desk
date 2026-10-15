import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { StatusBadge, CardSkeleton, Card } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import { ClipboardList } from 'lucide-react'
import type { LaundryOrder } from '@/types'

export default function History() {
  const [orders, setOrders] = useState<LaundryOrder[] | undefined>(undefined)

  useEffect(() => {
    supabase
      .from('laundry_orders')
      .select('*')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => setOrders(data ?? []))
  }, [])

  return (
    <StudentLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Order History</h1>

        {orders === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-10">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card className="flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.order_id}</p>
                    <p className="text-xs text-gray-500">
                      {order.clothes_count} clothes · {formatDate(order.submitted_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
