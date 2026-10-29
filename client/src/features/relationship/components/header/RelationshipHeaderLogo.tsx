const RelationshipHeaderLogo = () => {
  return (
    <div className="flex items-center gap-3.5">
      {/* App Icon */}
      <div
        className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200 shrink-0"
        aria-hidden="true"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>

      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
          Chatter
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-normal">
          Your connections
        </p>
      </div>
    </div>
  );
};

export default RelationshipHeaderLogo;
