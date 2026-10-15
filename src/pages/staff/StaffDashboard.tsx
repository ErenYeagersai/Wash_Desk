import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { StaffLayout } from '@/components/layout/StaffLayout'
import { Button, StatusBadge, CardSkeleton, Card } from '@/components/ui'
import { formatRelative } from '@/utils/formatDate'
import type { OrderStatus } from '@/types'

interface StatCounts {
  SUBMITTED: number
  RECEIVED: number
  PROCESSING: number
  COMPLETED: number
}

interface OrderRow {
  id: string
  order_id: string
  bag_id: string
  clothes_count: number
  status: OrderStatus
  submitted_at: string
  profiles: { name: string; registration_id: string } | null
  laundry_bags: { bag_id: string } | null
}

export default function StaffDashboard() {
  const [counts, setCounts] = useState<StatCounts | null>(null)
  const [orders, setOrders] = useState<OrderRow[] | undefined>(undefined)

  async function loadData() {
    const [countRes, ordersRes] = await Promise.all([
      supabase
        .from('laundry_orders')
        .select('status')
        .not('status', 'in', '("PICKED_UP","CANCELLED")'),
      supabase
        .from('laundry_orders')
        .select('id, order_id, clothes_count, status, submitted_at, bag_id, profiles(name, registration_id), laundry_bags(bag_id)')
        .not('status', 'in', '("PICKED_UP","CANCELLED")')
        .order('submitted_at', { ascending: true })
        .limit(20),
    ])

    if (countRes.data) {
      const c: StatCounts = { SUBMITTED: 0, RECEIVED: 0, PROCESSING: 0, COMPLETED: 0 }
      countRes.data.forEach(r => {
        if (r.status in c) c[r.status as keyof StatCounts]++
      })
      setCounts(c)
    }

    setOrders((ordersRes.data as unknown as OrderRow[]) ?? [])
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('staff-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laundry_orders' }, loadData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const STAT_CARDS = [
    { label: 'Submitted',   key: 'SUBMITTED',  color: 'bg-blue-50 text-blue-700' },
    { label: 'Received',    key: 'RECEIVED',   color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Processing',  key: 'PROCESSING', color: 'bg-amber-50 text-amber-700' },
    { label: 'Ready',       key: 'COMPLETED',  color: 'bg-green-50 text-green-700' },
  ] as const

  return (
    <StaffLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Staff Dashboard</h1>
          <Link to="/staff/scan">
            <Button leftIcon={<QrCode className="w-4 h-4" />}>Scan Bag</Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STAT_CARDS.map(({ label, key, color }) => (
            <Card key={key} className="text-center py-4">
              <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>
                {counts ? counts[key] : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </Card>
          ))}
        </div>

        {/* Priority queue */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Clock className="w-4 h-4" /> Active Orders (oldest first)
          </h2>

          {orders === undefined ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <CardSkeleton key={i} />)}</div>
          ) : orders.length === 0 ? (
            <Card className="text-center py-10 text-gray-500">
              No active laundry. All caught up!
            </Card>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <Link key={order.id} to={`/staff/orders/${order.id}`}>
                  <Card className="flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.order_id}</p>
                      <p className="text-xs text-gray-500">
                        {order.profiles?.name ?? '—'} · {order.laundry_bags?.bag_id ?? '—'} · {order.clothes_count} clothes
                      </p>
                      <p className="text-xs text-gray-400">{formatRelative(order.submitted_at)}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}
