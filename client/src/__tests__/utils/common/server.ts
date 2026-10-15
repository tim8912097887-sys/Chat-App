import { setupServer } from "msw/node";
import { authHandlers } from "../auth/http";

export const server = setupServer(...authHandlers);
