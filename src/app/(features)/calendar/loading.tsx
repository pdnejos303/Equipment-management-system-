// Path: src/app/(features)/calendar/loading.tsx
export default function CalendarLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface animate-pulse" />
          <div>
            <div className="h-5 w-24 bg-surface rounded animate-pulse" />
            <div className="h-3 w-16 bg-surface-dark rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="h-9 w-48 bg-surface rounded-xl animate-pulse" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-surface border border-border rounded-xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>

      {/* Nav bar skeleton */}
      <div className="h-12 bg-surface border border-border rounded-xl animate-pulse" />

      {/* Grid skeleton */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-8 border-r border-border last:border-r-0 animate-pulse bg-surface-dark/30" />
          ))}
        </div>
        {[...Array(5)].map((_, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {[...Array(7)].map((_, di) => (
              <div key={di} className="min-h-[90px] border-r border-border last:border-r-0 p-2" style={{ animationDelay: `${(wi * 7 + di) * 20}ms` }}>
                <div className="w-6 h-6 bg-surface-dark/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
