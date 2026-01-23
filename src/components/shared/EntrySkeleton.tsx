import { Skeleton } from "@/components/ui/skeleton";

interface EntrySkeletonProps {
  count?: number;
}

/**
 * EntrySkeleton - Reusable skeleton loader for list entries
 *
 * Used across Books, Series, and other list views to provide
 * consistent loading state UI
 */
export const EntrySkeleton = ({ count = 5 }: EntrySkeletonProps) => {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};
