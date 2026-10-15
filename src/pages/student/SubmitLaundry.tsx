import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { Button, Input, Card, Spinner } from '@/components/ui'
import type { AppSettings, LaundryBag } from '@/types'

export default function SubmitLaundry() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [bag, setBag] = useState<LaundryBag | null | undefined>(undefined)
  const [hasActive, setHasActive] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function loadData() {
      const [settingsRes, bagRes, activeRes] = await Promise.all([
        supabase.from('app_settings').select('key,value'),
        supabase
          .from('laundry_bags')
          .select('*')
          .eq('student_id', user!.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('laundry_orders')
          .select('id')
          .eq('student_id', user!.id)
          .not('status', 'in', '("PICKED_UP","CANCELLED")')
          .maybeSingle(),
      ])

      const map: Record<string, number> = {}
      settingsRes.data?.forEach(s => { map[s.key] = Number(s.value) })
      setSettings({
        delay_threshold_hours: map.delay_threshold_hours ?? 48,
        monthly_bag_limit:     map.monthly_bag_limit ?? 4,
        min_clothes:           map.min_clothes ?? 15,
        max_clothes:           map.max_clothes ?? 25,
      })
      setBag(bagRes.data ?? null)
      setHasActive(!!activeRes.data)
      setLoadingData(false)
    }
    loadData()
  }, [user])

  // Build schema once settings load
  const schema = z.object({
    clothes_count: z
      .number({ invalid_type_error: 'Enter a number' })
      .int()
      .min(settings?.min_clothes ?? 15, `Minimum ${settings?.min_clothes ?? 15} clothes`)
      .max(settings?.max_clothes ?? 25, `Maximum ${settings?.max_clothes ?? 25} clothes`),
    notes: z.string().max(300).optional(),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    const { error } = await supabase.rpc('submit_laundry_order', {
      p_bag_id:       bag!.id,
      p_clothes_count: data.clothes_count,
      p_notes:        data.notes ?? null,
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    toast('Laundry submitted successfully!', 'success')
    navigate('/current')
  }

  if (loadingData) {
    return (
      <StudentLayout>
        <div className="flex justify-center mt-16"><Spinner size="lg" /></div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Submit Laundry</h1>

        {!bag && (
          <Card className="text-center py-8 text-gray-500">
            No laundry bag assigned to your account. Contact the laundry office.
          </Card>
        )}

        {bag && hasActive && (
          <Card className="bg-amber-50 border-amber-200 text-amber-800 text-sm">
            You already have an active order. Wait for it to be picked up before submitting again.
          </Card>
        )}

        {bag && !hasActive && settings && (
          <Card>
            <div className="mb-4 text-sm text-gray-500">
              Bag: <span className="font-medium text-gray-800">{bag.bag_id}</span>
              <span className="ml-4">
                Allowed: {settings.min_clothes}–{settings.max_clothes} clothes
              </span>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                label="Number of Clothes"
                type="number"
                inputMode="numeric"
                placeholder={`${settings.min_clothes}–${settings.max_clothes}`}
                error={errors.clothes_count?.message}
                {...register('clothes_count', { valueAsNumber: true })}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="E.g. handle white shirts carefully"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  {...register('notes')}
                />
                {errors.notes && <p className="text-xs text-red-600">{errors.notes.message}</p>}
              </div>

              <Button type="submit" loading={isSubmitting} className="w-full">
                Submit Bag
              </Button>
            </form>
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
