// Path: src/app/(features)/in-use/loading.tsx

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-surface-hover ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export default function InUseLoading() {
  return (
    <div className="page-enter space-y-6">
      <div className="space-y-1">
        <Shimmer className="h-7 w-52" />
        <Shimmer className="h-4 w-64" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-8 w-12" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Shimmer className="h-10 flex-1" />
        <Shimmer className="h-10 w-24" />
      </div>

      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card space-y-3" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center gap-3">
              <Shimmer className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              {[...Array(i % 2 === 0 ? 2 : 1)].map((_, j) => (
                <Shimmer key={j} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
