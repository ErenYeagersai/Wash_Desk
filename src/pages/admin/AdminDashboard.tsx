import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge, Card, Skeleton } from '@/components/ui'
import { formatRelative } from '@/utils/formatDate'
import type { OrderStatus } from '@/types'

interface Stats {
  total_students: number
  active: number
  processing: number
  completed: number
  delayed: number
}

interface RecentOrder {
  id: string
  order_id: string
  status: OrderStatus
  submitted_at: string
  clothes_count: number
  profiles: { name: string; registration_id: string } | null
  laundry_bags: { bag_id: string } | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentOrder[] | undefined>(undefined)

  useEffect(() => {
    async function load() {
      const [studentsRes, ordersRes, settingsRes, recentRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('laundry_orders').select('status, submitted_at').not('status', 'in', '("PICKED_UP","CANCELLED")'),
        supabase.from('app_settings').select('key,value').eq('key', 'delay_threshold_hours').single(),
        supabase
          .from('laundry_orders')
          .select('id, order_id, status, submitted_at, clothes_count, profiles(name, registration_id), laundry_bags(bag_id)')
          .order('submitted_at', { ascending: false })
          .limit(20),
      ])

      const thresholdHours = Number(settingsRes.data?.value ?? 48)
      const cutoff = new Date(Date.now() - thresholdHours * 3_600_000)
      const activeOrders = ordersRes.data ?? []

      setStats({
        total_students: studentsRes.count ?? 0,
        active:     activeOrders.length,
        processing: activeOrders.filter(o => o.status === 'PROCESSING').length,
        completed:  activeOrders.filter(o => o.status === 'COMPLETED').length,
        delayed:    activeOrders.filter(o =>
          ['SUBMITTED', 'RECEIVED', 'PROCESSING'].includes(o.status) &&
          new Date(o.submitted_at) < cutoff
        ).length,
      })

      setRecent((recentRes.data as unknown as RecentOrder[]) ?? [])
    }
    load()
  }, [])

  const STAT_CARDS = [
    { label: 'Total Students', value: stats?.total_students, color: 'text-primary' },
    { label: 'Active Orders',  value: stats?.active,         color: 'text-blue-600' },
    { label: 'Processing',     value: stats?.processing,     color: 'text-amber-600' },
    { label: 'Ready Pickup',   value: stats?.completed,      color: 'text-green-600' },
    { label: 'Delayed',        value: stats?.delayed,        color: 'text-red-600' },
  ]

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAT_CARDS.map(({ label, value, color }) => (
            <Card key={label} className="text-center py-4">
              {value === undefined ? (
                <Skeleton className="h-7 w-10 mx-auto mb-1" />
              ) : (
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </Card>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/delayed"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" /> Delayed Laundry
            {stats?.delayed ? (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">{stats.delayed}</span>
            ) : null}
          </Link>
          <Link
            to="/admin/logs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Clock className="w-4 h-4" /> Audit Logs
          </Link>
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>

          {recent === undefined ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : recent.length === 0 ? (
            <Card className="text-center py-8 text-gray-500 text-sm">No orders yet.</Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Bag</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recent.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
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
                      <td className="px-4 py-3 text-gray-500">{formatRelative(o.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
