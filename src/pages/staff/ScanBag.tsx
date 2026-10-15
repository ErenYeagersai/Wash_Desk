import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Search, CameraOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { StaffLayout } from '@/components/layout/StaffLayout'
import { Button, Input, Card, Spinner } from '@/components/ui'

type ScanState = 'idle' | 'scanning' | 'resolving' | 'error'

export default function ScanBag() {
  const navigate = useNavigate()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState('')
  const [cameraSupported, setCameraSupported] = useState(true)

  // Manual search state
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<{ id: string; order_id: string; profiles: { name: string; registration_id: string } | null; laundry_bags: { bag_id: string } | null; status: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function startScanner() {
    setScanError('')
    setScanState('scanning')
    try {
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) {
        setCameraSupported(false)
        setScanState('idle')
        return
      }
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScan(decodedText),
        () => { /* ignore per-frame errors */ },
      )
    } catch {
      setCameraSupported(false)
      setScanState('idle')
    }
  }

  async function stopScanner() {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
      scannerRef.current.clear()
    }
    scannerRef.current = null
    setScanState('idle')
  }

  async function handleScan(qrToken: string) {
    await stopScanner()
    setScanState('resolving')
    setScanError('')

    // Resolve qr_token → bag → active order
    const { data: bag } = await supabase
      .from('laundry_bags')
      .select('id, bag_id')
      .eq('qr_token', qrToken)
      .maybeSingle()

    if (!bag) {
      setScanError('This QR code is not recognised. Use manual search below.')
      setScanState('error')
      return
    }

    const { data: order } = await supabase
      .from('laundry_orders')
      .select('id')
      .eq('bag_id', bag.id)
      .not('status', 'in', '("PICKED_UP","CANCELLED")')
      .maybeSingle()

    setScanState('idle')

    if (!order) {
      setScanError(`Bag ${bag.bag_id} has no active order.`)
      return
    }

    navigate(`/staff/orders/${order.id}`)
  }

  // Debounced manual search
  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(() => runSearch(value.trim()), 300)
  }

  async function runSearch(q: string) {
    setSearching(true)
    // PostgREST cannot filter on nested relation columns — query by order_id only,
    // then also search profiles and bags separately and union the order IDs.
    const [byOrder, byProfile, byBag] = await Promise.all([
      supabase
        .from('laundry_orders')
        .select('id')
        .not('status', 'in', '("PICKED_UP","CANCELLED")')
        .ilike('order_id', `%${q}%`)
        .limit(10),
      supabase
        .from('profiles')
        .select('id')
        .or(`name.ilike.%${q}%,registration_id.ilike.%${q}%`)
        .limit(10),
      supabase
        .from('laundry_bags')
        .select('id')
        .ilike('bag_id', `%${q}%`)
        .limit(10),
    ])

    const orderIds = new Set<string>([
      ...(byOrder.data?.map(r => r.id) ?? []),
    ])
    if (byProfile.data?.length) {
      const { data: profileOrders } = await supabase
        .from('laundry_orders')
        .select('id')
        .not('status', 'in', '("PICKED_UP","CANCELLED")')
        .in('student_id', byProfile.data.map(p => p.id))
        .limit(10)
      profileOrders?.forEach(r => orderIds.add(r.id))
    }
    if (byBag.data?.length) {
      const { data: bagOrders } = await supabase
        .from('laundry_orders')
        .select('id')
        .not('status', 'in', '("PICKED_UP","CANCELLED")')
        .in('bag_id', byBag.data.map(b => b.id))
        .limit(10)
      bagOrders?.forEach(r => orderIds.add(r.id))
    }

    if (orderIds.size === 0) { setResults([]); setSearching(false); return }

    const { data } = await supabase
      .from('laundry_orders')
      .select('id, order_id, status, profiles(name, registration_id), laundry_bags(bag_id)')
      .in('id', [...orderIds])
      .limit(10)
    setResults((data as unknown as typeof results) ?? [])
    setSearching(false)
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <StaffLayout>
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Scan Bag</h1>

        {/* QR Scanner */}
        {cameraSupported ? (
          <Card className="space-y-4">
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-gray-900 min-h-[200px] flex items-center justify-center">
              {scanState !== 'scanning' && (
                <p className="text-gray-400 text-sm">Camera inactive</p>
              )}
            </div>

            {scanState === 'resolving' && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Spinner size="sm" /> Resolving bag...
              </div>
            )}

            {scanError && (
              <p className="text-sm text-red-600 text-center">{scanError}</p>
            )}

            <div className="flex gap-3">
              {scanState !== 'scanning' ? (
                <Button className="flex-1" onClick={startScanner}>
                  Start Camera
                </Button>
              ) : (
                <Button variant="outline" className="flex-1" onClick={stopScanner}>
                  Stop Camera
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card className="flex items-center gap-3 text-gray-600 bg-amber-50 border-amber-200">
            <CameraOff className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm">
              Camera not available. Use manual search below.
            </p>
          </Card>
        )}

        {/* Manual search */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Search className="w-4 h-4" /> Manual Search
          </h2>

          <Input
            placeholder="Order ID, Reg ID, Bag ID, or student name"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
          />

          {searching && (
            <div className="flex justify-center mt-4"><Spinner size="sm" /></div>
          )}

          {!searching && query && results.length === 0 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              No active orders found for "{query}".
            </p>
          )}

          {results.length > 0 && (
            <div className="space-y-2 mt-3">
              {results.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/staff/orders/${r.id}`)}
                  className="w-full text-left"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <p className="text-sm font-medium text-gray-900">{r.order_id}</p>
                    <p className="text-xs text-gray-500">
                      {r.profiles?.name ?? '—'} · {r.profiles?.registration_id ?? '—'} · {r.laundry_bags?.bag_id ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{r.status.toLowerCase()}</p>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Search by Registration ID, Bag ID, Order ID, or student name.
            </p>
          )}
        </div>
      </div>
    </StaffLayout>
  )
}
