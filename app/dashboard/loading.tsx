// Utilix — student dashboard skeleton (Server Component)
// Owner: A
import { Skeleton } from "@/components";

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8" aria-busy="true">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-44 rounded-lg" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
      </div>
    </div>
  );
}
