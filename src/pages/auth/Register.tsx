import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'

const schema = z.object({
  registration_id: z
    .string()
    .min(5, 'Registration ID is required')
    .max(20)
    .regex(/^[A-Z0-9]+$/i, 'Only letters and numbers'),
  name:        z.string().min(2, 'Full name is required').max(100),
  hostel:      z.string().min(1, 'Hostel / block is required').max(100),
  room_number: z.string().min(1, 'Room number is required').max(20),
  phone:       z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email:       z.string().email('Enter a valid email'),
  password:    z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          registration_id: data.registration_id.toUpperCase(),
          name:            data.name,
          hostel:          data.hostel,
          room_number:     data.room_number,
          phone:           data.phone,
        },
      },
    })
    if (error) {
      setServerError(error.message)
      return
    }
    // handle_new_user trigger creates the profile row
    // PublicOnlyRoute reads the profile role and redirects to the correct dashboard
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Registration ID"
          placeholder="23CSE1045"
          autoComplete="off"
          error={errors.registration_id?.message}
          {...register('registration_id')}
        />
        <Input
          label="Full Name"
          placeholder="Student Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Hostel / Block"
            placeholder="Block A"
            error={errors.hostel?.message}
            {...register('hostel')}
          />
          <Input
            label="Room Number"
            placeholder="A-204"
            error={errors.room_number?.message}
            {...register('room_number')}
          />
        </div>
        <Input
          label="Phone Number"
          type="tel"
          placeholder="9876543210"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          error={errors.password?.message}
          hint="At least 8 characters with 1 uppercase letter and 1 number."
          {...register('password')}
        />

        {serverError && (
          <p className="text-sm text-red-600">{serverError}</p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Create Account
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        Already registered?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
