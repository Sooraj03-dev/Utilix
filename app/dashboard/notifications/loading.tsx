// Utilix — notifications page skeleton (Server Component)
// Owner: A
import { Skeleton } from "@/components";

export default function NotificationsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="h-20 rounded-3xl" />
      <Skeleton className="h-20 rounded-3xl" />
      <Skeleton className="h-20 rounded-3xl" />
      <Skeleton className="h-20 rounded-3xl" />
    </div>
  );
}
