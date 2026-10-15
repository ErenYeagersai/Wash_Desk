import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { Button, Input, Card, RoleBadge } from '@/components/ui'

const schema = z.object({
  name:        z.string().min(2, 'Name is required').max(100),
  hostel:      z.string().min(1, 'Hostel is required').max(100),
  room_number: z.string().min(1, 'Room number is required').max(20),
  phone:       z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
})

type FormData = z.infer<typeof schema>

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        profile?.name ?? '',
      hostel:      profile?.hostel ?? '',
      room_number: profile?.room_number ?? '',
      phone:       profile?.phone ?? '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        name:        profile.name,
        hostel:      profile.hostel,
        room_number: profile.room_number,
        phone:       profile.phone,
      })
    }
  }, [profile, reset])

  async function onSubmit(data: FormData) {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', profile!.id)
    if (error) {
      toast(error.message, 'error')
      return
    }
    await refreshProfile()
    toast('Profile updated.', 'success')
    reset(data)
  }

  return (
    <StudentLayout>
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">My Profile</h1>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{profile?.name}</p>
              <p className="text-sm text-gray-500">{profile?.registration_id}</p>
            </div>
            <RoleBadge role={profile?.role ?? 'student'} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-2 border-t border-gray-100">
            <Input
              label="Full Name"
              error={errors.name?.message}
              {...register('name')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hostel / Block"
                error={errors.hostel?.message}
                {...register('hostel')}
              />
              <Input
                label="Room Number"
                error={errors.room_number?.message}
                {...register('room_number')}
              />
            </div>
            <Input
              label="Phone"
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!isDirty}
              className="w-full"
            >
              Save Changes
            </Button>
          </form>
        </Card>
      </div>
    </StudentLayout>
  )
}
