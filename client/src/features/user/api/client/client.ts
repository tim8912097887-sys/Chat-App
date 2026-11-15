import axios from "axios";
import { normalizeApiError } from "../../../../common/error/api-error";

const prefix = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL + "/api/v1/users"
  : "/api/v1/users";
export const userClient = axios.create({
  baseURL: prefix,
  timeout: 10_000,
  withCredentials: true,
});

userClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);
