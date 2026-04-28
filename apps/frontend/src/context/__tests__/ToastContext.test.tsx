import { renderHook, act } from '@testing-library/react'
import { vi, test, expect } from 'vitest'
import { ToastProvider, useToastContext } from '../ToastContext.js'

function wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

test('addToast adds a toast', () => {
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => result.current.addToast('Hello'))
  expect(result.current.toasts).toHaveLength(1)
  expect(result.current.toasts[0].message).toBe('Hello')
})

test('removeToast removes the correct toast', () => {
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => result.current.addToast('A'))
  const id = result.current.toasts[0].id
  act(() => result.current.removeToast(id))
  expect(result.current.toasts).toHaveLength(0)
})

test('toast auto-dismisses after 5 seconds', () => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => result.current.addToast('Auto'))
  expect(result.current.toasts).toHaveLength(1)
  act(() => vi.advanceTimersByTime(5000))
  expect(result.current.toasts).toHaveLength(0)
  vi.useRealTimers()
})

test('adding 4th toast drops the oldest, keeping only 3', () => {
  const { result } = renderHook(() => useToastContext(), { wrapper })
  act(() => {
    result.current.addToast('1')
    result.current.addToast('2')
    result.current.addToast('3')
    result.current.addToast('4')
  })
  expect(result.current.toasts).toHaveLength(3)
  expect(result.current.toasts.map((t) => t.message)).toEqual(['2', '3', '4'])
})

test('useToastContext throws when used outside provider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => renderHook(() => useToastContext())).toThrow(
    'useToastContext must be used within ToastProvider'
  )
  vi.restoreAllMocks()
})
