/* eslint-disable react-refresh/only-export-components -- context object and hook intentionally co-located */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'

export interface Toast {
  id: string
  message: string
  onRetry?: () => void
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, onRetry?: () => void) => void
  removeToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const addToast = useCallback((message: string, onRetry?: () => void) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev.slice(-2), { id, message, onRetry }])
    const tid = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timerIds.current.delete(tid)
    }, 5000)
    timerIds.current.add(tid)
  }, [])

  useEffect(() => {
    const ids = timerIds.current
    return () => {
      ids.forEach(clearTimeout)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}
