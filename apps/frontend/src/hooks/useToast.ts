import { useToastContext } from '../context/ToastContext.js'

export function useToast() {
  const { addToast } = useToastContext()
  return { addToast }
}
