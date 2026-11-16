import { ApiError } from "../error/api-error";

const isRetryableReadError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return (
    error.status === undefined ||
    error.status >= 500 ||
    error.status === 429 ||
    error.status === 408
  );
};

export const readQueryRetry = {
  retry: (failureCount: number, error: unknown) =>
    failureCount < 3 && isRetryableReadError(error),
  retryDelay: (attemptIndex: number) => 1000 * 2 ** attemptIndex,
};
