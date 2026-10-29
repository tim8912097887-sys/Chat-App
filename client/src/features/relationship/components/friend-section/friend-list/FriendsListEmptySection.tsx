const FriendsListEmptySection = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-slate-200/60 bg-slate-50/50 px-5 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m16 0v-2a4 4 0 00-3-3.87M12 7a4 4 0 11-8 0 4 4 0 018 0zm5-3.87a4 4 0 010 7.75"
          />
        </svg>
      </div>

      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-700">No friends yet</p>
        <p className="text-xs text-slate-400 max-w-60">
          Add friends to see them here.
        </p>
      </div>
    </div>
  );
};

export default FriendsListEmptySection;
