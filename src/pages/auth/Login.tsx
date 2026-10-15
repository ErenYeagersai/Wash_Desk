import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button, Input } from '@/components/ui'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError('Invalid email or password.')
      return
    }
    // AuthContext will update; redirect is handled by the router
    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Welcome back</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        {serverError && (
          <p className="text-sm text-red-600">{serverError}</p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        No account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Register here
        </Link>
      </p>
    </AuthLayout>
  )
}
