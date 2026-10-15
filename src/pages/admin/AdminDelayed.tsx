import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge, Skeleton, Card } from '@/components/ui'
import type { OrderStatus } from '@/types'

interface DelayedOrder {
  id: string
  order_id: string
  status: OrderStatus
  submitted_at: string
  clothes_count: number
  profiles: { name: string; registration_id: string } | null
  laundry_bags: { bag_id: string } | null
}

function hoursElapsed(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
}

export default function AdminDelayed() {
  const [orders, setOrders] = useState<DelayedOrder[] | undefined>(undefined)
  const [threshold, setThreshold] = useState(48)

  useEffect(() => {
    async function load() {
      const settingsRes = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'delay_threshold_hours')
        .single()

      const hours = Number(settingsRes.data?.value ?? 48)
      setThreshold(hours)

      const cutoff = new Date(Date.now() - hours * 3_600_000).toISOString()

      const { data } = await supabase
        .from('laundry_orders')
        .select('id, order_id, status, submitted_at, clothes_count, profiles(name, registration_id), laundry_bags(bag_id)')
        .in('status', ['SUBMITTED', 'RECEIVED', 'PROCESSING'])
        .lt('submitted_at', cutoff)
        .order('submitted_at', { ascending: true })

      setOrders((data as unknown as DelayedOrder[]) ?? [])
    }
    load()
  }, [])

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Delayed Laundry</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Orders in SUBMITTED, RECEIVED, or PROCESSING for more than {threshold} hours.
          </p>
        </div>

        {orders === undefined ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-12">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No delayed laundry. Everything is on time!</p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Bag</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Hours Elapsed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-red-50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${o.id}`} className="text-primary hover:underline font-medium">
                        {o.order_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p>{o.profiles?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{o.profiles?.registration_id ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.laundry_bags?.bag_id ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-red-600">{hoursElapsed(o.submitted_at)}h</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
