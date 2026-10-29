const UserNotFoundSection = () => {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-8 text-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16 16 4 4M8.5 11h5"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">No user found</p>
        <p className="text-sm text-slate-500">
          We couldn't find a user with this search code. Please check the code
          and try again.
        </p>
      </div>
    </div>
  );
};

export default UserNotFoundSection;
