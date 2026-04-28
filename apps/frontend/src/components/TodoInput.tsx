import { useState } from 'react'
import { useCreateTodo } from '../hooks/useCreateTodo.js'
import { useToast } from '../hooks/useToast.js'
import { MAX_TODO_LENGTH } from '@todo-app/shared'

export function TodoInput() {
  const [text, setText] = useState('')
  const { addToast } = useToast()
  const { mutate: createTodo, isPending } = useCreateTodo({
    onError: (message, retry) => addToast(message, retry),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    createTodo(text.trim(), {
      onSuccess: () => setText(''),
    })
  }

  return (
    <div>
      <label htmlFor="new-todo" className="sr-only">
        Add new todo
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          id="new-todo"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TODO_LENGTH}
          placeholder="Add a new task..."
          disabled={isPending}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          Add
        </button>
      </form>
    </div>
  )
}
