import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useToast, type ToastVariant } from '@/contexts/ToastContext'

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 shrink-0" />,
  error:   <AlertCircle className="w-4 h-4 shrink-0" />,
  info:    <Info className="w-4 h-4 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0" />,
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border shadow-md text-sm',
            VARIANT_STYLES[t.variant],
          )}
        >
          {ICONS[t.variant]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="text-current opacity-60 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
