export function LoadingState() {
  return (
    <div className="flex flex-col gap-3 py-4" role="status">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-10 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading your todos…</span>
    </div>
  )
}
