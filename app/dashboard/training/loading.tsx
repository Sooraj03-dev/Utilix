// Utilix — training page skeleton (Server Component)
// Owner: A
import { Skeleton } from "@/components";

export default function TrainingLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-40 rounded-xl" />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
    </div>
  );
}
