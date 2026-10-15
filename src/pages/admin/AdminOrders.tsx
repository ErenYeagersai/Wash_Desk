import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StatusBadge, Skeleton, Card } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import type { OrderStatus } from '@/types'

const PAGE_SIZE = 20

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All statuses', value: '' },
  { label: 'Submitted',    value: 'SUBMITTED' },
  { label: 'Received',     value: 'RECEIVED' },
  { label: 'Processing',   value: 'PROCESSING' },
  { label: 'Completed',    value: 'COMPLETED' },
  { label: 'Picked Up',    value: 'PICKED_UP' },
  { label: 'Cancelled',    value: 'CANCELLED' },
]

interface OrderRow {
  id: string
  order_id: string
  status: OrderStatus
  submitted_at: string
  clothes_count: number
  profiles: { name: string; registration_id: string } | null
  laundry_bags: { bag_id: string } | null
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[] | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadOrders(q: string, status: string, pageNum: number) {
    setOrders(undefined)
    let builder = supabase
      .from('laundry_orders')
      .select('id, order_id, status, submitted_at, clothes_count, profiles(name, registration_id), laundry_bags(bag_id)')
      .order('submitted_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE)

    if (status) builder = builder.eq('status', status)
    if (q) builder = builder.or(
      `order_id.ilike.%${q}%,profiles.registration_id.ilike.%${q}%,profiles.name.ilike.%${q}%`
    )

    const { data } = await builder
    const rows = (data as unknown as OrderRow[]) ?? []
    setOrders(rows)
    setHasMore(rows.length === PAGE_SIZE + 1)
    if (rows.length === PAGE_SIZE + 1) rows.pop()
  }

  useEffect(() => {
    loadOrders(query, statusFilter, page)
  }, [statusFilter, page])

  function handleQueryChange(value: string) {
    setQuery(value)
    setPage(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadOrders(value, statusFilter, 0), 300)
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-900">All Orders</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder="Search order, student, reg ID…"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        {orders === undefined ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-10 text-gray-500 text-sm">No orders found.</Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Bag</th>
                  <th className="px-4 py-3 text-left">Clothes</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {orders.map(o => (
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
                    <td className="px-4 py-3 text-gray-600">{o.clothes_count}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {(page > 0 || hasMore) && (
          <div className="flex justify-center gap-3">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={!hasMore}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
