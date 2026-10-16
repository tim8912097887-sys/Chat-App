import axios from "axios";
import { normalizeApiError } from "../../../../common/error/api-error";

const prefix = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL + "/api/v1/auth"
  : "/api/v1/auth";
export const authClient = axios.create({
  baseURL: prefix,
  timeout: 10_000,
});

// Interceptors for error handling
authClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);
