import type { Todo } from '@todo-app/shared'
import { useToggleTodo } from '../hooks/useToggleTodo.js'
import { useDeleteTodo } from '../hooks/useDeleteTodo.js'
import { useToast } from '../hooks/useToast.js'

export function TodoItem({ todo }: { todo: Todo }) {
  const { addToast } = useToast()

  const toggle = useToggleTodo({
    onError: (message, retry) => addToast(message, retry),
  })

  const deleteMutation = useDeleteTodo({
    onError: (message, retry) => addToast(message, retry),
  })

  return (
    <li className="flex items-center gap-3 rounded-md bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
      <label className="flex flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={toggle.isPending}
          onChange={() => toggle.mutate({ id: todo.id, completed: !todo.completed })}
          aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          className="h-5 w-5 cursor-pointer accent-blue-600"
        />
        <span
          className={
            todo.completed
              ? 'flex-1 text-gray-400 line-through dark:text-gray-500'
              : 'flex-1 text-gray-900 dark:text-gray-100'
          }
        >
          {todo.text}
        </span>
      </label>
      <button
        onClick={() => deleteMutation.mutate(todo.id)}
        disabled={deleteMutation.isPending}
        aria-label={`Delete "${todo.text}"`}
        className="rounded p-1 text-gray-400 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </li>
  )
}
