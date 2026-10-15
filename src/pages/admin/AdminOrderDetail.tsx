import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrderAction } from '@/hooks/useOrderAction'
import { useToast } from '@/contexts/ToastContext'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button, StatusBadge, CardSkeleton, Card, ConfirmModal } from '@/components/ui'
import { STATUS_STEPS, STATUS_LABELS } from '@/utils/statusHelpers'
import { formatDateTime, formatRelative } from '@/utils/formatDate'
import type { OrderStatus } from '@/types'

interface AuditRow {
  id: string
  action: string
  old_status: string | null
  new_status: string
  created_at: string
  profiles: { name: string } | null
}

interface OrderWithDetails {
  id: string
  order_id: string
  clothes_count: number
  notes: string | null
  status: OrderStatus
  submitted_at: string
  received_at: string | null
  processing_at: string | null
  completed_at: string | null
  picked_up_at: string | null
  profiles: { name: string; registration_id: string; hostel: string; room_number: string } | null
  laundry_bags: { bag_id: string } | null
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const { advance, loading: advancing, error: actionError } = useOrderAction()

  const [order, setOrder] = useState<OrderWithDetails | null | undefined>(undefined)
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [confirming, setConfirming] = useState(false)

  async function fetchAll() {
    if (!id) return
    const [orderRes, logsRes] = await Promise.all([
      supabase
        .from('laundry_orders')
        .select('*, profiles(name, registration_id, hostel, room_number), laundry_bags(bag_id)')
        .eq('id', id)
        .single(),
      supabase
        .from('audit_logs')
        .select('id, action, old_status, new_status, created_at, profiles(name)')
        .eq('laundry_order_id', id)
        .order('created_at', { ascending: true }),
    ])
    setOrder((orderRes.data as unknown as OrderWithDetails) ?? null)
    setAuditLogs((logsRes.data as unknown as AuditRow[]) ?? [])
  }

  useEffect(() => { fetchAll() }, [id])

  async function handleCancel() {
    if (!order) return
    const updated = await advance(order.id, 'CANCELLED')
    setConfirming(false)
    if (updated) {
      toast('Order cancelled.', 'success')
      fetchAll()
    }
  }

  const timestamps: Partial<Record<string, string | null>> = order ? {
    SUBMITTED:  order.submitted_at,
    RECEIVED:   order.received_at,
    PROCESSING: order.processing_at,
    COMPLETED:  order.completed_at,
    PICKED_UP:  order.picked_up_at,
  } : {}

  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : 0
  const canCancel = order && !['PICKED_UP', 'CANCELLED'].includes(order.status)

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto">
        <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> All Orders
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Order Detail</h1>

        {order === undefined ? (
          <CardSkeleton />
        ) : order === null ? (
          <Card>Order not found.</Card>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 text-lg">{order.order_id}</p>
                  <p className="text-sm text-gray-500">{formatRelative(order.submitted_at)}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div><dt className="text-gray-500">Student</dt><dd className="font-medium">{order.profiles?.name ?? '—'}</dd></div>
                <div><dt className="text-gray-500">Reg ID</dt><dd className="font-medium">{order.profiles?.registration_id ?? '—'}</dd></div>
                <div><dt className="text-gray-500">Hostel</dt><dd className="font-medium">{order.profiles?.hostel ?? '—'}</dd></div>
                <div><dt className="text-gray-500">Room</dt><dd className="font-medium">{order.profiles?.room_number ?? '—'}</dd></div>
                <div><dt className="text-gray-500">Bag</dt><dd className="font-medium">{order.laundry_bags?.bag_id ?? '—'}</dd></div>
                <div><dt className="text-gray-500">Clothes</dt><dd className="font-medium">{order.clothes_count}</dd></div>
              </dl>
              {order.notes && (
                <p className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 italic">"{order.notes}"</p>
              )}
            </Card>

            {/* Timeline */}
            <Card>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Status Timeline</h2>
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
                        <p className={`text-sm font-medium ${current ? 'text-primary' : done ? 'text-gray-700' : 'text-gray-400'}`}>{STATUS_LABELS[step]}</p>
                        {timestamps[step] && <p className="text-xs text-gray-400">{formatDateTime(timestamps[step])}</p>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Card>

            {/* Audit log */}
            {auditLogs.length > 0 && (
              <Card>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Audit Log</h2>
                <div className="space-y-2">
                  {auditLogs.map(log => (
                    <div key={log.id} className="flex items-start justify-between text-sm gap-4">
                      <div>
                        <p className="text-gray-700">
                          <span className="font-medium">{log.profiles?.name ?? 'System'}</span>
                          {log.old_status ? ` changed ${log.old_status} → ` : ' set '}
                          <span className="font-medium">{log.new_status}</span>
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cancel button (admin only) */}
            {canCancel && (
              <Button variant="danger" className="w-full" onClick={() => setConfirming(true)}>
                Cancel Order
              </Button>
            )}
            {actionError && <p className="text-sm text-red-600 text-center">{actionError}</p>}
          </div>
        )}

        {confirming && order && (
          <ConfirmModal
            title="Cancel this order?"
            message={`Order ${order.order_id} will be cancelled. This action is logged and cannot be undone.`}
            confirmLabel="Cancel Order"
            onConfirm={handleCancel}
            onCancel={() => setConfirming(false)}
            loading={advancing}
            danger
          />
        )}
      </div>
    </AdminLayout>
  )
}
