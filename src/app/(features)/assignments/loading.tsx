// Path: src/app/(features)/assignments/loading.tsx
export default function AssignmentsLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-surface rounded-lg animate-pulse" />
        <div className="h-9 w-32 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-16 bg-surface-dark rounded animate-pulse" />
            <div className="h-8 w-12 bg-surface-dark rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Active table skeleton */}
      <div className="card space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-surface-dark rounded" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4 py-2 border-b border-border last:border-0" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-4 w-20 bg-surface-dark rounded" />
              <div className="h-4 w-32 bg-surface-dark rounded" />
              <div className="h-4 w-24 bg-surface-dark rounded" />
              <div className="h-4 w-20 bg-surface-dark rounded" />
              <div className="h-4 w-24 bg-surface-dark rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* History table skeleton */}
      <div className="card space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-surface-dark rounded" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 py-2 border-b border-border last:border-0" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-4 w-20 bg-surface-dark rounded" />
              <div className="h-4 w-32 bg-surface-dark rounded" />
              <div className="h-4 w-24 bg-surface-dark rounded" />
              <div className="h-4 w-24 bg-surface-dark rounded" />
              <div className="h-4 w-24 bg-surface-dark rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
