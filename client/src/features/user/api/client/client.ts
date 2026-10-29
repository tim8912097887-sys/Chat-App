import axios from "axios";
import { normalizeApiError } from "../../../../common/error/api-error";
import axiosRetry from "axios-retry";

const prefix = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL + "/api/v1/users"
  : "/api/v1/users";
export const userClient = axios.create({
  baseURL: prefix,
  timeout: 10_000,
  withCredentials: true,
});

axiosRetry(userClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay, // Backoff delay (1s, 2s, 4s...)
  retryCondition: (error) => {
    // Retry on network errors, 5xx server errors, 429, and 408
    const status = error.response?.status;
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (status !== undefined &&
        (status >= 500 || status === 429 || status === 408))
    );
  },
});

userClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);
