// Path: src/app/(features)/assets/[id]/loading.tsx
export default function AssetDetailLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header: back + name + status + actions */}
      <div className="flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-8 w-8 bg-surface rounded-lg" />
          <div className="space-y-2 min-w-0">
            <div className="h-6 w-56 bg-surface-dark rounded" />
            <div className="flex gap-2 items-center">
              <div className="h-4 w-20 bg-surface-dark rounded" />
              <div className="h-5 w-16 bg-surface-dark rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 bg-surface rounded-lg" />
          <div className="h-9 w-20 bg-surface rounded-lg" />
          <div className="h-9 w-9 bg-surface rounded-lg" />
        </div>
      </div>

      {/* Top grid: photo + info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo */}
        <div className="card animate-pulse">
          <div className="aspect-square w-full bg-surface-dark rounded-xl" />
          <div className="flex gap-2 mt-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 w-14 bg-surface-dark rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-3 animate-pulse">
            <div className="h-4 w-28 bg-surface-dark rounded" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-3 w-16 bg-surface-dark rounded" />
                  <div className="h-4 w-32 bg-surface-dark rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Depreciation card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card space-y-2 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-3 w-20 bg-surface-dark rounded" />
                <div className="h-7 w-24 bg-surface-dark rounded" />
                <div className="h-2 w-full bg-surface-dark rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-surface-dark rounded-t-lg animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>

      {/* Tab content */}
      <div className="card space-y-3 animate-pulse">
        <div className="h-4 w-40 bg-surface-dark rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-border last:border-0">
            <div className="h-4 w-48 bg-surface-dark rounded" />
            <div className="h-4 w-24 bg-surface-dark rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
