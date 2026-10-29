const SessionLoading = () => {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <div
          className="mb-6 flex size-12 items-center justify-center rounded-xl bg-indigo-50"
          aria-hidden="true"
        >
          <div className="size-6 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" />
        </div>

        <h1 className="text-lg font-semibold tracking-tight">
          Restoring your session
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Please wait while we securely verify your account.
        </p>

        <span className="sr-only">Loading your session...</span>
      </div>
    </main>
  );
};

export default SessionLoading;
