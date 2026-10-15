import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { RoleBadge, Skeleton, Card } from '@/components/ui'
import type { Profile } from '@/types'

const PAGE_SIZE = 20

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[] | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadUsers(q: string, role: string, pageNum: number) {
    setUsers(undefined)
    let builder = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE)

    if (role) builder = builder.eq('role', role)
    if (q) builder = builder.or(`name.ilike.%${q}%,registration_id.ilike.%${q}%`)

    const { data } = await builder
    const rows = (data as Profile[]) ?? []
    setUsers(rows)
    setHasMore(rows.length === PAGE_SIZE + 1)
    if (rows.length === PAGE_SIZE + 1) rows.pop()
  }

  useEffect(() => { loadUsers(query, roleFilter, page) }, [roleFilter, page])

  function handleQueryChange(value: string) {
    setQuery(value)
    setPage(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadUsers(value, roleFilter, 0), 300)
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              placeholder="Search name or registration ID…"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(0) }}
          >
            <option value="">All roles</option>
            <option value="student">Student</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {users === undefined ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : users.length === 0 ? (
          <Card className="text-center py-10 text-gray-500 text-sm">No users found.</Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Reg ID</th>
                  <th className="px-4 py-3 text-left">Hostel</th>
                  <th className="px-4 py-3 text-left">Room</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.registration_id}</td>
                    <td className="px-4 py-3 text-gray-600">{u.hostel}</td>
                    <td className="px-4 py-3 text-gray-600">{u.room_number}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
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
