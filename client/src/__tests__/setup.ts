import { afterAll, beforeAll, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./utils/common/server";
import { useAuthStore } from "../features/auth/store/store";

beforeAll(() => server.listen());

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.resetAllMocks();
  server.resetHandlers();
  useAuthStore.setState({
    accessToken: null,
    user: null,
    status: "checking",
  });
});

afterAll(() => server.close());
