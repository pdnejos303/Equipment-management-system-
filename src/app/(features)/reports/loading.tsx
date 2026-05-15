// Path: src/app/(features)/reports/loading.tsx
export default function ReportsLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-52 bg-surface-dark rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-surface rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-surface rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="card space-y-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-10 w-10 bg-surface-dark rounded-xl animate-pulse" />
            <div className="h-3 w-20 bg-surface-dark rounded animate-pulse" />
            <div className="h-7 w-28 bg-surface-dark rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card space-y-3 animate-pulse">
            <div className="h-4 w-40 bg-surface-dark rounded" />
            <div className="h-64 w-full bg-surface-dark rounded-xl" />
          </div>
        ))}
      </div>

      {/* Category breakdown table */}
      <div className="card space-y-3 animate-pulse">
        <div className="h-4 w-44 bg-surface-dark rounded" />
        <div className="flex gap-4 pb-2 border-b border-border">
          {[96, 48, 80, 80, 80].map((w, i) => (
            <div key={i} className="h-3 bg-surface-dark rounded" style={{ width: w }} />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex gap-4 py-2 border-b border-border last:border-0"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="h-4 w-24 bg-surface-dark rounded" />
            <div className="h-4 w-12 bg-surface-dark rounded" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
            <div className="h-4 w-20 bg-surface-dark rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
