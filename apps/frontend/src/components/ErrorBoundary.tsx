import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-800 dark:bg-red-950"
          >
            <p className="text-sm text-red-700 dark:text-red-300">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
