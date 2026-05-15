// Path: src/app/(features)/assets/loading.tsx
export default function AssetsLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-surface-dark rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-surface rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-surface rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-16 bg-surface-dark rounded animate-pulse" />
            <div className="h-7 w-20 bg-surface-dark rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="card space-y-3">
        <div className="h-10 w-full bg-surface-dark rounded-lg animate-pulse" />
        <div className="flex gap-2 flex-wrap">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-7 w-20 bg-surface-dark rounded-full animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card space-y-3 animate-pulse">
        <div className="flex gap-4 pb-2 border-b border-border">
          {[32, 48, 96, 56, 72, 64, 72, 56].map((w, i) => (
            <div key={i} className="h-3 bg-surface-dark rounded" style={{ width: w }} />
          ))}
        </div>
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex gap-4 py-2 border-b border-border last:border-0 items-center"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="h-4 w-4 bg-surface-dark rounded" />
            <div className="h-10 w-10 bg-surface-dark rounded-lg" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
            <div className="h-4 w-40 bg-surface-dark rounded flex-1" />
            <div className="h-5 w-16 bg-surface-dark rounded-full" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
            <div className="h-4 w-24 bg-surface-dark rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
