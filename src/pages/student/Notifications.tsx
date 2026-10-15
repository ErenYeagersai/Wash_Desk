import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { Button, CardSkeleton, Card } from '@/components/ui'
import { formatRelative } from '@/utils/formatDate'
import { Bell } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Notification } from '@/types'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[] | undefined>(undefined)

  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotifications(data ?? []))
  }, [user])

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read')
    setNotifications(prev => prev?.map(n => ({ ...n, is_read: true })))
  }

  const unread = notifications?.filter(n => !n.is_read).length ?? 0

  return (
    <StudentLayout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>

        {notifications === undefined ? (
          <div className="space-y-3">{[1, 2].map(i => <CardSkeleton key={i} />)}</div>
        ) : notifications.length === 0 ? (
          <Card className="text-center py-10">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No notifications yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <Card
                key={n.id}
                className={cn(!n.is_read && 'border-l-4 border-l-primary bg-blue-50/30')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
