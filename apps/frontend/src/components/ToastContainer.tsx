import { useToastContext } from '../context/ToastContext.js'

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className="flex max-w-sm items-center gap-3 rounded bg-red-600 px-4 py-3 text-white shadow-lg"
        >
          <span className="flex-1">{toast.message}</span>
          {toast.onRetry && (
            <button
              onClick={() => {
                toast.onRetry?.()
                removeToast(toast.id)
              }}
              className="font-medium underline"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
            className="ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
