import { expect } from "vitest";
import type { Response } from "supertest";

export function expectSuccessMessageResponse(
  res: Response,
  status: number,
  message: string,
): void {
  expect(res.status).toBe(status);
  expect(res.body.state).toBe("success");
  expect(res.body.data).toEqual({ message });
}

export function expectSuccessDataResponse(
  res: Response,
  status: number,
  data: unknown,
): void {
  expect(res.status).toBe(status);
  expect(res.body.state).toBe("success");
  expect(res.body.data).toEqual(data);
}
