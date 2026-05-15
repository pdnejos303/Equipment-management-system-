// Path: src/app/(features)/overview/loading.tsx
import type { CSSProperties } from "react";

function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-surface-hover ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="page-enter space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-7 w-44" />
          <Shimmer className="h-4 w-52" />
        </div>
        <div className="flex items-center gap-2">
          {["80px", "80px", "88px", "96px", "72px", "80px"].map((w, i) => (
            <Shimmer key={i} className="h-8 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="card space-y-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <Shimmer className="w-11 h-11 rounded-xl" />
              <Shimmer className="w-12 h-4 rounded" />
            </div>
            <div className="space-y-2">
              <Shimmer className="h-3 w-20 rounded" />
              <Shimmer className="h-7 w-28 rounded" />
              <Shimmer className="h-3 w-36 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Gauge + Pie charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="card space-y-3"
            style={{ animationDelay: `${(i + 4) * 60}ms` }}
          >
            <Shimmer className="h-4 w-32 rounded" />
            <Shimmer className="h-52 rounded-xl" />
            <div className="flex justify-center gap-4">
              {[...Array(3)].map((_, j) => (
                <Shimmer key={j} className="h-3 w-16 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main chart skeleton */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Shimmer className="h-4 w-56 rounded" />
            <Shimmer className="h-3 w-40 rounded" />
          </div>
          <div className="text-right space-y-1.5">
            <Shimmer className="h-6 w-28 rounded ml-auto" />
            <Shimmer className="h-3 w-16 rounded ml-auto" />
          </div>
        </div>
        <Shimmer className="h-72 rounded-xl" />
      </div>

      {/* Two-column chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card space-y-3">
            <Shimmer className="h-4 w-40 rounded" />
            <Shimmer className="h-64 rounded-xl" />
          </div>
        ))}
      </div>

      {/* Bottom two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card space-y-3">
            <Shimmer className="h-4 w-36 rounded" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Shimmer className="h-3 w-32 rounded" />
                    <Shimmer className="h-3 w-20 rounded" />
                  </div>
                  <Shimmer className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
