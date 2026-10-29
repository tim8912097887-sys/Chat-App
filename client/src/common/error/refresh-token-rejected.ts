import { ApiError } from "./api-error";

export const isRefreshTokenRejected = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  // This function is used specifically for the refresh request.
  // A 401 means the server rejected the credentials.
  return error.status === 401;
};
