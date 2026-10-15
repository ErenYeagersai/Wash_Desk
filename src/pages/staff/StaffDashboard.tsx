import { StaffLayout } from '@/components/layout/StaffLayout'
import { Card } from '@/components/ui'
import { Construction } from 'lucide-react'

export default function StaffDashboard() {
  return (
    <StaffLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Staff Dashboard</h1>
        <Card className="text-center py-12">
          <Construction className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Staff features coming soon</p>
          <p className="text-sm text-gray-400 mt-1">QR scan, order management, and status updates</p>
        </Card>
      </div>
    </StaffLayout>
  )
}
