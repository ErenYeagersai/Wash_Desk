import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Package, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { Button, StatusBadge, CardSkeleton, Card } from '@/components/ui'
import { formatRelative } from '@/utils/formatDate'
import type { LaundryOrder } from '@/types'

export default function Dashboard() {
  const { profile } = useAuth()
  const [activeOrder, setActiveOrder] = useState<LaundryOrder | null | undefined>(undefined)
  const [recentOrders, setRecentOrders] = useState<LaundryOrder[]>([])

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('laundry_orders')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(5)
      if (!data) return
      const active = data.find(o => o.status !== 'PICKED_UP' && o.status !== 'CANCELLED') ?? null
      setActiveOrder(active)
      setRecentOrders(data.slice(0, 3))
    }
    fetch()
  }, [])

  const loading = activeOrder === undefined

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Hi, {profile?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.hostel} · Room {profile?.room_number}
          </p>
        </div>

        {/* Active order */}
        {loading ? (
          <CardSkeleton />
        ) : activeOrder ? (
          <Card className="border-l-4 border-l-primary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Current Order</p>
                <p className="font-semibold text-gray-900">{activeOrder.order_id}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {activeOrder.clothes_count} clothes · {formatRelative(activeOrder.submitted_at)}
                </p>
              </div>
              <StatusBadge status={activeOrder.status} />
            </div>
            <Link to={`/orders/${activeOrder.id}`} className="mt-4 block">
              <Button variant="outline" size="sm" className="w-full">View Details</Button>
            </Link>
          </Card>
        ) : (
          <Card className="text-center py-8">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No active laundry</p>
            <p className="text-sm text-gray-400 mb-4">Submit your bag to get started</p>
            <Link to="/submit">
              <Button leftIcon={<PlusCircle className="w-4 h-4" />}>Submit Laundry</Button>
            </Link>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/submit">
            <Card className="text-center py-5 hover:border-primary transition-colors">
              <PlusCircle className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Submit</p>
            </Card>
          </Link>
          <Link to="/history">
            <Card className="text-center py-5 hover:border-primary transition-colors">
              <Clock className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">History</p>
            </Card>
          </Link>
        </div>

        {/* Recent orders */}
        {recentOrders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Orders</h2>
            <div className="space-y-2">
              {recentOrders.map(order => (
                <Link key={order.id} to={`/orders/${order.id}`}>
                  <Card className="flex items-center justify-between hover:shadow-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.order_id}</p>
                      <p className="text-xs text-gray-500">{order.clothes_count} clothes · {formatRelative(order.submitted_at)}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
