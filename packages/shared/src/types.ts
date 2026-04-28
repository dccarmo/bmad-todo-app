export const MAX_TODO_LENGTH = 500

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

export interface CreateTodoInput {
  text: string
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}

export interface UpdateTodoInput {
  completed: boolean
}
