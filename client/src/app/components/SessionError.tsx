import { useState } from "react";
import { initializeSession } from "../../common/hooks/useInitializeSession";
import { Button } from "../../common/components/button";

const SessionError = () => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (retrying) return;

    setRetrying(true);

    try {
      await initializeSession();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
        aria-labelledby="session-error-title"
        role="alert"
      >
        <div
          className="mb-5 flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-6"
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
          </svg>
        </div>

        <h1
          id="session-error-title"
          className="text-xl font-semibold tracking-tight"
        >
          Unable to restore your session
        </h1>

        <p className="mt-3 mb-3 text-sm leading-6 text-slate-600">
          We couldn't connect to the server to verify your session. Your sign-in
          state hasn't been cleared. Please check your connection and try again.
        </p>

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => handleRetry()}
        >
          Try again
        </Button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          If the problem persists, try again later.
        </p>
      </section>
    </main>
  );
};

export default SessionError;
