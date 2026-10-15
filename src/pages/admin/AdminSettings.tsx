import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button, Input, Card } from '@/components/ui'

const schema = z.object({
  monthly_bag_limit:     z.number({ invalid_type_error: 'Enter a number' }).int().min(1).max(100),
  min_clothes:           z.number({ invalid_type_error: 'Enter a number' }).int().min(1).max(100),
  max_clothes:           z.number({ invalid_type_error: 'Enter a number' }).int().min(1).max(200),
  delay_threshold_hours: z.number({ invalid_type_error: 'Enter a number' }).int().min(1).max(720),
}).refine(d => d.max_clothes > d.min_clothes, {
  message: 'Max clothes must be greater than min clothes',
  path: ['max_clothes'],
})

type FormData = z.infer<typeof schema>

export default function AdminSettings() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('key,value')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, number> = {}
        data.forEach(s => { map[s.key] = Number(s.value) })
        reset({
          monthly_bag_limit:     map.monthly_bag_limit ?? 4,
          min_clothes:           map.min_clothes ?? 15,
          max_clothes:           map.max_clothes ?? 25,
          delay_threshold_hours: map.delay_threshold_hours ?? 48,
        })
      })
  }, [reset])

  async function onSubmit(data: FormData) {
    const updates = Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value),
      updated_by: profile!.id,
    }))

    const { error } = await supabase
      .from('app_settings')
      .upsert(updates, { onConflict: 'key' })

    if (error) {
      toast('Failed to save settings.', 'error')
      return
    }
    toast('Settings saved.', 'success')
    reset(data)
  }

  return (
    <AdminLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            <div className="border-b border-gray-100 pb-4 mb-2">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Submission Limits</h2>
              <div className="space-y-4">
                <Input
                  label="Monthly bag limit (per student)"
                  type="number"
                  inputMode="numeric"
                  hint="Max number of bag submissions per student per calendar month."
                  error={errors.monthly_bag_limit?.message}
                  {...register('monthly_bag_limit', { valueAsNumber: true })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Min clothes per bag"
                    type="number"
                    inputMode="numeric"
                    error={errors.min_clothes?.message}
                    {...register('min_clothes', { valueAsNumber: true })}
                  />
                  <Input
                    label="Max clothes per bag"
                    type="number"
                    inputMode="numeric"
                    error={errors.max_clothes?.message}
                    {...register('max_clothes', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Delay Detection</h2>
              <Input
                label="Delay threshold (hours)"
                type="number"
                inputMode="numeric"
                hint="Orders active longer than this are flagged as delayed."
                error={errors.delay_threshold_hours?.message}
                {...register('delay_threshold_hours', { valueAsNumber: true })}
              />
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!isDirty}
              className="w-full"
            >
              Save Settings
            </Button>
          </form>
        </Card>
      </div>
    </AdminLayout>
  )
}
