const ProfilePageSkeleton = () => {
  return (
    <main className="min-h-screen bg-[#F4F5F8] p-4 sm:p-8 animate-pulse">
      <div
        className="max-w-3xl mx-auto bg-white rounded-3xl
        border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8"
      >
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <div className="h-7 w-40 bg-slate-200 rounded-lg" />
          <div className="h-4 w-64 max-w-full bg-slate-100 rounded" />
        </div>

        {/* Personal Information */}
        <section className="space-y-5">
          <div className="h-5 w-44 bg-slate-200 rounded" />

          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 shrink-0" />

            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-44 bg-slate-100 rounded" />
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-xl" />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-11 w-full bg-slate-100 rounded-xl" />
          </div>
        </section>

        {/* Search Code */}
        <section className="pt-6 border-t border-slate-100 space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-36 bg-slate-200 rounded" />
            <div className="h-4 w-64 max-w-full bg-slate-100 rounded" />
          </div>

          <div className="rounded-2xl bg-slate-100 p-5 space-y-4">
            <div className="h-3 w-44 bg-slate-200 rounded" />

            <div className="flex items-center justify-between gap-3">
              <div className="h-8 w-40 bg-slate-200 rounded" />
              <div className="h-10 w-24 bg-slate-200 rounded-xl" />
            </div>

            <div className="h-3 w-56 max-w-full bg-slate-200 rounded" />
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProfilePageSkeleton;
