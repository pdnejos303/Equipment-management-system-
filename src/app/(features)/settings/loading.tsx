// Path: src/app/(features)/settings/loading.tsx
export default function SettingsLoading() {
  return (
    <div className="page-enter max-w-2xl mx-auto space-y-5">
      <div className="space-y-2 animate-pulse">
        <div className="h-7 w-28 bg-surface rounded" />
        <div className="h-4 w-64 bg-surface-dark rounded" />
      </div>

      {/* Language card */}
      <div className="card p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-surface-dark rounded" />
          <div className="h-4 w-20 bg-surface-dark rounded" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 w-full bg-surface-dark rounded-xl"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Dark themes card */}
      <div className="card p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-surface-dark rounded" />
          <div className="h-4 w-28 bg-surface-dark rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-surface-dark rounded-xl"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Light themes card */}
      <div className="card p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-surface-dark rounded" />
          <div className="h-4 w-28 bg-surface-dark rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-surface-dark rounded-xl"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
