import React from 'react'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-lg mb-4">
            <span className="text-primary font-bold text-2xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-white">UNi LaunDRY</h1>
          <p className="text-white/70 text-sm mt-1">Hostel Laundry Management</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
