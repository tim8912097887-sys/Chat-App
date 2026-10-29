import { Button } from "../button";

type RetrySectionProps = {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
};

const RetrySection = ({
  message,
  onRetry,
  retrying = false,
}: RetrySectionProps) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-5 py-8 text-center"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
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
            d="M12 9v4m0 4h.01M10.3 3.86 2.7 17a2 2 0 0 0 1.74 3h15.12a2 2 0 0 0 1.74-3L13.74 3.86a2 2 0 0 0-3.48 0Z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">
          Couldn't load this section
        </p>
        <p className="text-sm text-slate-500">{message}</p>
      </div>

      <Button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        unstyled
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {retrying ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
};

export default RetrySection;
