// Path: src/app/(features)/profile/loading.tsx
export default function ProfileLoading() {
  return (
    <div className="page-enter max-w-2xl mx-auto space-y-5">
      {/* Profile header card */}
      <div className="card p-6 flex items-center gap-5 animate-pulse">
        <div className="w-16 h-16 bg-surface-dark rounded-2xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 w-40 bg-surface-dark rounded" />
          <div className="h-4 w-56 bg-surface-dark rounded" />
          <div className="h-5 w-24 bg-surface-dark rounded-full" />
        </div>
      </div>

      {/* Personal info card */}
      <div className="card p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-surface-dark rounded" />
          <div className="h-4 w-24 bg-surface-dark rounded" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 bg-surface-dark rounded" />
            <div className="h-10 w-full bg-surface-dark rounded-lg" />
          </div>
        ))}
        <div className="h-9 w-24 bg-surface-dark rounded-lg" />
      </div>

      {/* Password card */}
      <div className="card p-6 space-y-4 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-surface-dark rounded" />
          <div className="h-4 w-32 bg-surface-dark rounded" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 bg-surface-dark rounded" />
            <div className="h-10 w-full bg-surface-dark rounded-lg" />
          </div>
        ))}
        <div className="h-9 w-32 bg-surface-dark rounded-lg" />
      </div>

      {/* Logout card */}
      <div className="card p-6 space-y-4 animate-pulse">
        <div className="h-4 w-20 bg-surface-dark rounded" />
        <div className="h-9 w-28 bg-surface-dark rounded-lg" />
      </div>
    </div>
  );
}
