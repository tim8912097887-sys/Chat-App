import { describe, expect, it, vi, vitest } from 'vitest';
import { signupUserInput } from '../../utils/auth/factory.js';
import { api } from '../../utils/common/app.js';
import { SIGNUP_URL } from '../../utils/auth/constants.js';
import { truncateAll, userRepository } from '../../utils/common/query.js';
import { beforeEach } from 'vitest';
import {
  expectServerError,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { userResult } from '../../utils/auth/assertion.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';
import { invalidSignupInputs } from '../../utils/auth/invalid-inputs.js';
import path from 'path';
import { CloudinaryImageStorage } from '../../../domain/auth/image.service.js';

const validInput = signupUserInput();

describe('signup', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it.each([
      {
        description:
          'when signup uses minimum name and password lengths should return 201 with message',
        input: signupUserInput({ name: 'Aa', password: '12345678' }),
      },
      {
        description:
          'when signup uses maximum name and password lengths should return 201 with message',
        input: signupUserInput({
          name: 'a'.repeat(100),
          password: 'a'.repeat(72),
        }),
      },
      {
        description: 'when signup uses a 2048 character imageUrl should return 201 with message',
        input: {
          ...validInput,
          imageUrl: `https://example.com/${'a'.repeat(2028)}`,
        },
      },
      {
        description:
          'when signup uses an email with surrounding whitespace and uppercase letters should normalize it',
        input: { ...validInput, email: '  TEST@EXAMPLE.COM  ' },
        expectedEmail: 'test@example.com',
      },
      {
        description: 'when signup uses a 254 character email should return 201 with message',
        input: {
          ...validInput,
          email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
        },
      },
    ])('$description', async ({ input, expectedEmail }) => {
      // vitest
      //   .spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage')
      //   .mockResolvedValue({ url: 'ok', publicId: crypto.randomUUID() });
      const res = await api().post(SIGNUP_URL).send(input);
      const user = await userRepository.findByEmail(expectedEmail ?? input.email);

      expectSuccessMessageResponse(res, 201, 'Signed up');
      expect(user?.email).toBe(expectedEmail ?? input.email);
      expect(user?.imageUrl).toBe(null);
    });

    it('when user signup with same email twice should return 200 with message from both', async () => {
      const input = signupUserInput({});

      const res1 = await api().post(SIGNUP_URL).send(input);
      const res2 = await api().post(SIGNUP_URL).send(input);
      const user = await userRepository.findByEmail(input.email);

      expectSuccessMessageResponse(res1, 201, 'Signed up');
      expectSuccessMessageResponse(res2, 201, 'Signed up');
      expect(user).toMatchObject(
        userResult({
          name: input.name,
          email: input.email,
          imageUrl: null,
          status: 'ACTIVE',
        }),
      );
    });

    it('when two user signup with same email concurrently should return 200 with message from both', async () => {
      const input = signupUserInput({});

      const [res1, res2] = await Promise.all([
        api().post(SIGNUP_URL).send(input),
        api().post(SIGNUP_URL).send(input),
      ]);
      const user = await userRepository.findByEmail(input.email);

      expectSuccessMessageResponse(res1, 201, 'Signed up');
      expectSuccessMessageResponse(res2, 201, 'Signed up');
      expect(user).toMatchObject(
        userResult({
          name: input.name,
          email: input.email,
          imageUrl: null,
          status: 'ACTIVE',
        }),
      );
    });

    it('when user signup with correct image format should return 201 with message', async () => {
      vitest.spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage').mockResolvedValue({
        url: 'ok',
        publicId: crypto.randomUUID(),
      });
      const input = signupUserInput({});
      const validFilePath = path.join(__dirname, '../../fixtures/valid.jpeg');

      const res = await api()
        .post(SIGNUP_URL)
        .attach('image', validFilePath)
        .field('name', input.name)
        .field('email', input.email)
        .field('password', input.password);
      const user = await userRepository.findByEmail(input.email);

      expectSuccessMessageResponse(res, 201, 'Signed up');
      expect(user?.email).toBe(input.email);
      expect(user?.imageUrl).not.toBe(null);
    });
  });

  describe('validation fail', () => {
    it.each(invalidSignupInputs)('$description', async ({ input, expectedDetail }) => {
      const res = await api().post(SIGNUP_URL).send(input);

      expectValidationError(res, expectedDetail);
      expect(await userRepository.findByEmail(validInput.email)).toBeNull();
    });

    it('when user signup with invalid image format should return 415 with message', async () => {
      const input = signupUserInput({});
      const invalidFilePath = path.join(__dirname, '../../fixtures/invalid.txt');

      const res = await api()
        .post(SIGNUP_URL)
        .attach('image', invalidFilePath)
        .field('name', input.name)
        .field('email', input.email)
        .field('password', input.password);

      expect(res.status).toBe(415);
      expect(res.body).toMatchObject({
        state: 'error',
        error: { code: 'UnSupportedImageTypeError' },
        data: null,
      });
      expect(await userRepository.findByEmail(validInput.email)).toBeNull();
    });
  });

  describe('server error', () => {
    it('when user repository fails during signup should return 500 with server error', async () => {
      vi.spyOn(MongoUserRepository.prototype, 'create').mockRejectedValue(
        new Error('database unavailable'),
      );

      const res = await api()
        .post(SIGNUP_URL)
        .send(signupUserInput({ email: 'server-error@example.com' }));

      expectServerError(res);
    });
  });
});
