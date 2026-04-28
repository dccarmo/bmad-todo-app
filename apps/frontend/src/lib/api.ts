import type { Todo } from '@todo-app/shared'

const API_BASE = '/api/v1'

export async function getTodos(): Promise<Todo[]> {
  const res = await fetch(`${API_BASE}/todos`)
  if (!res.ok) {
    throw new Error(`Failed to fetch todos: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Todo[]>
}

export async function createTodo(text: string): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message || 'Failed to create todo'
    )
  }
  return res.json() as Promise<Todo>
}

export async function toggleTodo(id: string, completed: boolean): Promise<Todo> {
  const res = await fetch(`${API_BASE}/todos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  if (!res.ok) throw new Error(`Failed to toggle todo: ${res.status}`)
  return res.json() as Promise<Todo>
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete todo: ${res.status}`)
}
