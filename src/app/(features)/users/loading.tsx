// Path: src/app/(features)/users/loading.tsx
export default function UsersLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-44 bg-surface-dark rounded animate-pulse" />
        </div>
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

      {/* Table */}
      <div className="card space-y-3 animate-pulse">
        <div className="flex gap-4 pb-2 border-b border-border">
          {[120, 160, 64, 64, 48].map((w, i) => (
            <div key={i} className="h-3 bg-surface-dark rounded" style={{ width: w }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex gap-4 py-3 border-b border-border last:border-0 items-center"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="h-9 w-9 bg-surface-dark rounded-full flex-shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-4 w-32 bg-surface-dark rounded" />
              <div className="h-3 w-48 bg-surface-dark rounded" />
            </div>
            <div className="h-5 w-20 bg-surface-dark rounded-full" />
            <div className="h-4 w-16 bg-surface-dark rounded" />
            <div className="h-8 w-8 bg-surface-dark rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
