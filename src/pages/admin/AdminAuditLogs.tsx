import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Skeleton, Card } from '@/components/ui'
import { formatDateTime } from '@/utils/formatDate'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 20

interface LogRow {
  id: string
  action: string
  old_status: string | null
  new_status: string
  created_at: string
  laundry_order_id: string
  laundry_orders: { order_id: string } | null
  profiles: { name: string; registration_id: string } | null
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<LogRow[] | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    async function load() {
      setLogs(undefined)
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, old_status, new_status, created_at, laundry_order_id, profiles(name, registration_id), laundry_orders(order_id)')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

      const rows = (data as unknown as LogRow[]) ?? []
      setHasMore(rows.length > PAGE_SIZE)
      setLogs(rows.slice(0, PAGE_SIZE))
    }
    load()
  }, [page])

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Every status change, oldest entry last. Immutable — no edits or deletes.</p>

        {logs === undefined ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : logs.length === 0 ? (
          <Card className="text-center py-10 text-gray-500 text-sm">No audit entries yet.</Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Order</th>
                  <th className="px-4 py-3 text-left">Changed by</th>
                  <th className="px-4 py-3 text-left">Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/orders/${log.laundry_order_id}`} className="text-primary hover:underline font-medium">
                        {log.laundry_orders?.order_id ?? log.laundry_order_id.slice(0, 8) + '…'}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{log.profiles?.name ?? 'System'}</p>
                      {log.profiles?.registration_id && (
                        <p className="text-xs text-gray-400">{log.profiles.registration_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.old_status ? (
                        <span>{log.old_status} <span className="text-gray-400">→</span> {log.new_status}</span>
                      ) : (
                        <span>{log.new_status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(page > 0 || hasMore) && (
          <div className="flex justify-center gap-3">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button disabled={!hasMore} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
