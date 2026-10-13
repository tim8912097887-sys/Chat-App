import { describe, expect, it, vi } from "vitest";
import { loginUserInput, signupUserInput } from "../../utils/auth/factory.js";
import { api } from "../../utils/auth/app.js";
import { LOGIN_URL, SIGNUP_URL } from "../../utils/auth/constants.js";
import {
  authModel,
  truncateAuthAndUser,
  userModel,
  userRepository,
} from "../../utils/auth/query.js";
import { beforeEach } from "vitest";
import {
  expectSuccessDataResponse,
  expectSuccessMessageResponse,
} from "../../utils/common/assertion.js";
import { MongoUserRepository } from "../../../domain/user/user.repository.js";
import { invalidLoginInputs } from "../../utils/auth/invalid-inputs.js";

describe("login", () => {
  beforeEach(async () => {
    await truncateAuthAndUser();
  });

  describe("success", () => {
    it.each([
      {
        description:
          "when login uses minimum password lengths should return 201 with message",
        input: signupUserInput({
          password: "12345678",
        }),
      },
      {
        description:
          "when login uses maximum password lengths should return 201 with message",
        input: signupUserInput({
          password: "a".repeat(72),
        }),
      },
      {
        description:
          "when login uses an email with surrounding whitespace and uppercase letters should normalize it",
        input: signupUserInput({ email: "  TEST@EXAMPLE.COM  " }),
        expectedEmail: "test@example.com",
      },
      {
        description:
          "when login uses a 254 character email should return 201 with message",
        input: signupUserInput({
          email: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`,
        }),
      },
    ])("$description", async ({ input, expectedEmail }) => {
      const res = await api().post(SIGNUP_URL).send(input);
      const user = await userRepository.findByEmail(
        expectedEmail ?? input.email,
      );
      expectSuccessMessageResponse(res, 201, "Signed up");
      expect(user?.email).toBe(expectedEmail ?? input.email);

      const loginRes = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ email: input.email, password: input.password }));

      expectSuccessDataResponse(loginRes, 200, {
        accessToken: expect.any(String),
      });
    });
  });

  describe("business logic", () => {
    it("when login uses an email that does not exist should return invalid credentials", async () => {
      const res = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ email: "missing@example.com" }));

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        state: "error",
        error: {
          code: "BadRequestError",
          detail: "Email or password is incorrect.",
        },
        data: null,
      });
      expect(
        await userRepository.findByEmail("missing@example.com"),
      ).toBeNull();
    });

    it("when login uses a disabled user's credentials should return invalid credentials", async () => {
      const input = signupUserInput();
      await api().post(SIGNUP_URL).send(input);
      await userModel
        .updateOne({ email: input.email }, { $set: { status: "DISABLED" } })
        .exec();

      const res = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ email: input.email, password: input.password }));

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        state: "error",
        error: {
          code: "BadRequestError",
          detail: "Email or password is incorrect.",
        },
        data: null,
      });
      const user = await userRepository.findByEmail(input.email);
      expect(user?.loginAttempt).toBe(0);
      expect(user?.loginLockedAt).toBeNull();
    });

    it("when login uses an incorrect password should increment the failed attempt count", async () => {
      const input = signupUserInput();
      await api().post(SIGNUP_URL).send(input);

      const res = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ password: "IncorrectPassword123!" }));

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        state: "error",
        error: {
          code: "BadRequestError",
          detail: "Email or password is incorrect.",
        },
        data: null,
      });
      const user = await userRepository.findByEmail(input.email);
      expect(user?.loginAttempt).toBe(1);
      expect(user?.loginLockedAt).toBeNull();
    });

    it("when login succeeds after two incorrect passwords should clear the failed attempts", async () => {
      const input = signupUserInput();
      await api().post(SIGNUP_URL).send(input);

      for (let attempt = 0; attempt < 2; attempt++) {
        const failedLoginRes = await api()
          .post(LOGIN_URL)
          .send(loginUserInput({ password: "IncorrectPassword123!" }));

        expect(failedLoginRes.status).toBe(400);
        expect(failedLoginRes.body.error.detail).toBe(
          "Email or password is incorrect.",
        );
      }

      const loginRes = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ email: input.email, password: input.password }));

      expectSuccessDataResponse(loginRes, 200, {
        accessToken: expect.any(String),
      });
      const user = await userRepository.findByEmail(input.email);
      expect(user?.loginAttempt).toBe(0);
      expect(user?.loginLockedAt).toBeNull();
    });

    it("when login fails three times should reject a correct password while the account is locked", async () => {
      const input = signupUserInput();
      await api().post(SIGNUP_URL).send(input);

      for (let attempt = 0; attempt < 3; attempt++) {
        const failedLoginRes = await api()
          .post(LOGIN_URL)
          .send(loginUserInput({ password: "IncorrectPassword123!" }));

        expect(failedLoginRes.status).toBe(attempt === 2 ? 409 : 400);
      }

      const lockedUser = await userRepository.findByEmail(input.email);
      expect(lockedUser?.loginAttempt).toBe(0);
      expect(lockedUser?.loginLockedAt).toBeInstanceOf(Date);

      const res = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ email: input.email, password: input.password }));

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        state: "error",
        error: {
          code: "ServerConflictError",
          detail: "Account locked.",
        },
        data: null,
      });
      const user = await userRepository.findByEmail(input.email);
      expect(user?.loginAttempt).toBe(0);
      expect(user?.loginLockedAt).toEqual(lockedUser?.loginLockedAt);
    });
  });

  describe("validation fail", () => {
    it.each(invalidLoginInputs)(
      "$description",
      async ({ input, expectedDetail }) => {
        const res = await api().post(LOGIN_URL).send(input);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          state: "error",
          error: { code: "BadRequestError" },
          data: null,
        });
        expect(res.body.error.detail).toContain(expectedDetail);
        expect(await authModel.find({})).toHaveLength(0);
      },
    );
  });

  describe("server error", () => {
    it("when user repository fails during login should return 500 with server error", async () => {
      vi.spyOn(MongoUserRepository.prototype, "findByEmail").mockRejectedValue(
        new Error("database unavailable"),
      );

      const res = await api()
        .post(LOGIN_URL)
        .send(loginUserInput({ email: "server-error@example.com" }));

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        state: "error",
        error: {
          code: "SERVER_ERROR",
          detail: "An unexpected error occurred. Please try again later.",
        },
        data: null,
      });
    });
  });
});
