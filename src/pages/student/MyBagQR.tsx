import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { Card, Spinner } from '@/components/ui'
import type { LaundryBag } from '@/types'

export default function MyBagQR() {
  const { user } = useAuth()
  const [bag, setBag] = useState<LaundryBag | null | undefined>(undefined)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('laundry_bags')
      .select('*')
      .eq('student_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => setBag(data ?? null))
  }, [user])

  useEffect(() => {
    if (bag && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, bag.qr_token, {
        width: 240,
        margin: 2,
        color: { dark: '#1E3A5F', light: '#FFFFFF' },
      })
    }
  }, [bag])

  return (
    <StudentLayout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">My Bag QR</h1>

        {bag === undefined ? (
          <div className="flex justify-center mt-16"><Spinner size="lg" /></div>
        ) : bag === null ? (
          <Card className="text-center py-10 text-gray-500">
            No laundry bag assigned. Contact the laundry office.
          </Card>
        ) : (
          <Card className="text-center space-y-4">
            <p className="text-sm text-gray-500">
              Show this QR code to the laundry staff when submitting your bag.
            </p>
            <div className="flex justify-center">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{bag.bag_id}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{bag.qr_token}</p>
            </div>
            <p className="text-xs text-gray-400 italic">
              This token never contains personal information.
            </p>
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
