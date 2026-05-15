// Path: src/app/(features)/alerts/loading.tsx
export default function AlertsLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-surface-dark rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Severity tabs */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-surface rounded-full animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
        ))}
      </div>

      {/* Alert cards */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="card flex items-start gap-3 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-9 w-9 bg-surface-dark rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-48 bg-surface-dark rounded" />
                <div className="h-5 w-16 bg-surface-dark rounded-full" />
              </div>
              <div className="h-3 w-full max-w-md bg-surface-dark rounded" />
              <div className="h-3 w-32 bg-surface-dark rounded" />
            </div>
            <div className="h-8 w-20 bg-surface-dark rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
