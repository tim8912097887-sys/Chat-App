import { expect } from 'vitest';
import type { Response } from 'supertest';

export function expectSuccessMessageResponse(res: Response, status: number, message: string): void {
  expect(res.status).toBe(status);
  expect(res.body.state).toBe('success');
  expect(res.body.data).toEqual({ message });
}

export function expectSuccessDataResponse(res: Response, status: number, data: unknown): void {
  expect(res.status).toBe(status);
  expect(res.body.state).toBe('success');
  expect(res.body.data).toEqual(data);
}

export function expectValidationError(response: Response, expectedDetail: string) {
  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    state: 'error',
    error: { code: 'BadRequestError' },
    data: null,
  });
  expect(response.body.error.detail).toContain(expectedDetail);
}

export function expectAuthError(response: Response, expectedDetail: string) {
  expect(response.status).toBe(401);
  expect(response.body).toMatchObject({
    state: 'error',
    error: { code: 'UnauthenticationError' },
    data: null,
  });
  expect(response.body.error.detail).toContain(expectedDetail);
}
