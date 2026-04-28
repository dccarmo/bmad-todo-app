import { TodoPage } from './components/TodoPage.js'
import { ToastProvider } from './context/ToastContext.js'
import { ToastContainer } from './components/ToastContainer.js'

function App() {
  return (
    <ToastProvider>
      <TodoPage />
      <ToastContainer />
    </ToastProvider>
  )
}

export default App
