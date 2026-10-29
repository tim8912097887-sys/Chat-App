type FriendRequestsSkeletonProps = {
  count?: number;
};

const FriendRequestsSkeleton = ({ count = 3 }: FriendRequestsSkeletonProps) => {
  return (
    <ul
      className="space-y-2.5"
      role="status"
      aria-label="Loading friend requests"
    >
      {Array.from({ length: count }).map((_, index) => (
        <li
          key={index}
          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 animate-pulse"
        >
          {/* Avatar + Name Skeleton */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-2 min-w-0">
              <div className="h-3.5 w-28 bg-slate-200 rounded-md" />
              <div className="h-2.5 w-16 bg-slate-200 rounded-md" />
            </div>
          </div>

          {/* Action Buttons / Badge Skeleton */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-7 w-16 bg-slate-200 rounded-full" />
            <div className="h-7 w-16 bg-slate-200 rounded-full" />
          </div>
        </li>
      ))}
      <span className="sr-only">Loading friend requests...</span>
    </ul>
  );
};

export default FriendRequestsSkeleton;
