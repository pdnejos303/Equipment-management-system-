// Path: src/app/(features)/bookings/loading.tsx
export default function BookingsLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-surface rounded-lg animate-pulse" />
        <div className="h-9 w-28 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-20 bg-surface-dark rounded animate-pulse" />
            <div className="h-8 w-12 bg-surface-dark rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card space-y-3 animate-pulse">
        {/* Column headers */}
        <div className="flex gap-4 pb-2 border-b border-border">
          {[80, 48, 64, 64, 96, 56].map((w, i) => (
            <div key={i} className="h-3 bg-surface-dark rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-b border-border last:border-0" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-4 w-40 bg-surface-dark rounded" />
            <div className="h-4 w-24 bg-surface-dark rounded" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
            <div className="h-4 w-28 bg-surface-dark rounded" />
            <div className="h-5 w-16 bg-surface-dark rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
