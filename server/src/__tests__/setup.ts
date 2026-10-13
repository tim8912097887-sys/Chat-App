import { afterAll, beforeAll, beforeEach, vitest } from "vitest";
import {
  dbConnection,
  dbDisconnection,
} from "../infrastructure/persistence/db.js";

beforeEach(() => {
  vitest.resetAllMocks();
  vitest.restoreAllMocks();
  vitest.clearAllMocks();
});

beforeAll(async () => {
  await dbConnection();
});

afterAll(async () => {
  await dbDisconnection();
});
