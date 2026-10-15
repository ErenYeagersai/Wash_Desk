import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useUnreadCount(): number {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return

    async function fetch() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user!.id)
        .eq('is_read', false)
      setCount(count ?? 0)
    }

    fetch()

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `student_id=eq.${user.id}`,
        },
        () => fetch(),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  return count
}
