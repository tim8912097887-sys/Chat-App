const FriendListItemSkeleton = () => {
  return (
    <li
      aria-hidden="true"
      className="flex items-center justify-between p-3 rounded-2xl border border-transparent"
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-slate-200 animate-pulse shrink-0" />

        {/* User info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-28 max-w-full rounded bg-slate-200 animate-pulse" />

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
            <div className="h-3 w-12 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Chevron */}
      <div className="w-4 h-4 rounded bg-slate-100 animate-pulse shrink-0" />
    </li>
  );
};

export default FriendListItemSkeleton;
