// Path: src/app/(features)/maintenance/loading.tsx
export default function MaintenanceLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-surface rounded-lg animate-pulse" />
        <div className="h-9 w-36 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-24 bg-surface-dark rounded animate-pulse" />
            <div className="h-8 w-16 bg-surface-dark rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* AI predict skeleton */}
      <div className="card h-20 animate-pulse bg-surface" />

      {/* Upcoming skeleton */}
      <div className="card space-y-3 animate-pulse">
        <div className="h-4 w-40 bg-surface-dark rounded" />
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
            <div className="h-4 w-40 bg-surface-dark rounded" />
            <div className="h-4 w-24 bg-surface-dark rounded" />
          </div>
        ))}
      </div>

      {/* Asset groups skeleton */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card space-y-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex justify-between">
            <div className="h-5 w-48 bg-surface-dark rounded" />
            <div className="h-5 w-28 bg-surface-dark rounded" />
          </div>
          {[...Array(2)].map((_, j) => (
            <div key={j} className="flex justify-between py-1.5 border-t border-border">
              <div className="h-4 w-52 bg-surface-dark rounded" />
              <div className="h-4 w-32 bg-surface-dark rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
