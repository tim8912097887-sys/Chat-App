import { setupServer } from "msw/node";
import { authHandlers } from "../auth/http";
import { relationshipHandlers } from "../relationship/http";
import { userHandlers } from "../user/http";

export const server = setupServer(
  ...authHandlers,
  ...userHandlers,
  ...relationshipHandlers,
);
