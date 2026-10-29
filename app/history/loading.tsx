// Utilix — history page skeleton (Server Component)
// Owner: A
import { Skeleton } from "@/components";

export default function HistoryLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-32 rounded-xl" />
      <Skeleton className="h-11 w-72 rounded-2xl" />
      <Skeleton className="h-16 rounded-3xl" />
      <Skeleton className="h-16 rounded-3xl" />
      <Skeleton className="h-16 rounded-3xl" />
    </div>
  );
}
