import { describe, expect, it, vi } from "vitest";
import { signupUserInput } from "../../utils/auth/factory.js";
import { api } from "../../utils/auth/app.js";
import { SIGNUP_URL } from "../../utils/auth/constants.js";
import { truncateAuthAndUser, userRepository } from "../../utils/auth/query.js";
import { beforeEach } from "vitest";
import { expectSuccessMessageResponse } from "../../utils/common/assertion.js";
import { userResult } from "../../utils/auth/assertion.js";
import { MongoUserRepository } from "../../../domain/user/user.repository.js";
import { invalidSignupInputs } from "../../utils/auth/invalid-inputs.js";

const validInput = signupUserInput();

describe("signup", () => {
  beforeEach(async () => {
    await truncateAuthAndUser();
  });

  describe("success", () => {
    it.each([
      {
        description:
          "when signup uses minimum name and password lengths should return 201 with message",
        input: signupUserInput({ name: "Aa", password: "12345678" }),
      },
      {
        description:
          "when signup uses maximum name and password lengths should return 201 with message",
        input: signupUserInput({
          name: "a".repeat(100),
          password: "a".repeat(72),
        }),
      },
      {
        description:
          "when signup uses a 2048 character imageUrl should return 201 with message",
        input: {
          ...validInput,
          imageUrl: `https://example.com/${"a".repeat(2028)}`,
        },
      },
      {
        description:
          "when signup uses an email with surrounding whitespace and uppercase letters should normalize it",
        input: { ...validInput, email: "  TEST@EXAMPLE.COM  " },
        expectedEmail: "test@example.com",
      },
      {
        description:
          "when signup uses a 254 character email should return 201 with message",
        input: {
          ...validInput,
          email: `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`,
        },
      },
    ])("$description", async ({ input, expectedEmail }) => {
      const res = await api().post(SIGNUP_URL).send(input);
      const user = await userRepository.findByEmail(
        expectedEmail ?? input.email,
      );

      expectSuccessMessageResponse(res, 201, "Signed up");
      expect(user?.email).toBe(expectedEmail ?? input.email);
    });

    it("when user signup with same email twice should return 200 with message from both", async () => {
      const input = signupUserInput({});

      const res1 = await api().post(SIGNUP_URL).send(input);
      const res2 = await api().post(SIGNUP_URL).send(input);
      const user = await userRepository.findByEmail(input.email);

      expectSuccessMessageResponse(res1, 201, "Signed up");
      expectSuccessMessageResponse(res2, 201, "Signed up");
      expect(user).toMatchObject(
        userResult({
          name: input.name,
          email: input.email,
          imageUrl: input.imageUrl ?? null,
          status: "ACTIVE",
        }),
      );
    });

    it("when two user signup with same email concurrently should return 200 with message from both", async () => {
      const input = signupUserInput({});

      const [res1, res2] = await Promise.all([
        api().post(SIGNUP_URL).send(input),
        api().post(SIGNUP_URL).send(input),
      ]);
      const user = await userRepository.findByEmail(input.email);

      expectSuccessMessageResponse(res1, 201, "Signed up");
      expectSuccessMessageResponse(res2, 201, "Signed up");
      expect(user).toMatchObject(
        userResult({
          name: input.name,
          email: input.email,
          imageUrl: input.imageUrl ?? null,
          status: "ACTIVE",
        }),
      );
    });
  });

  describe("validation fail", () => {
    it.each(invalidSignupInputs)(
      "$description",
      async ({ input, expectedDetail }) => {
        const res = await api().post(SIGNUP_URL).send(input);

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          state: "error",
          error: { code: "BadRequestError" },
          data: null,
        });
        expect(res.body.error.detail).toContain(expectedDetail);
        expect(await userRepository.findByEmail(validInput.email)).toBeNull();
      },
    );
  });

  describe("server error", () => {
    it("when user repository fails during signup should return 500 with server error", async () => {
      vi.spyOn(MongoUserRepository.prototype, "create").mockRejectedValue(
        new Error("database unavailable"),
      );

      const res = await api()
        .post(SIGNUP_URL)
        .send(signupUserInput({ email: "server-error@example.com" }));

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
