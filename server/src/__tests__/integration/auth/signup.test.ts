import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAll } from '../../utils/common/query.js';
import { createSignupInput } from '../../utils/auth/factory.js';
import { signupRequest, signupWithImageRequest } from '../../utils/auth/request.js';
import {
  expectServerError,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { CloudinaryImageStorage } from '../../../domain/auth/image.service.js';
import { invalidSignupInputs } from '../../utils/auth/invalid-inputs.js';
import { findAllUsers, findUserByEmail, insertUser } from '../../utils/user/query.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';

const VALID_JPEG_PATH = path.join(__dirname, '../../fixtures/valid.jpeg');
const INVALID_FILE_PATH = path.join(__dirname, '../../fixtures/invalid.txt');

describe('Signup', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when_signup_with_valid_input_should_return_201_and_create_active_user', async () => {
      // Arrange
      const input = createSignupInput();

      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');

      const user = await findUserByEmail(input.email);
      expect(user).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          name: input.name,
          email: input.email,
          passwordHash: expect.any(String),
          imageUrl: null,
          searchCode: expect.stringMatching(/^[a-zA-Z0-9]{8}$/),
          status: 'ACTIVE',
          tokenVersion: 0,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(user?.passwordHash).not.toBe(input.password);
    });

    it.each([
      {
        description:
          'when_signup_uses_minimum_name_and_password_lengths_should_return_201_and_create_user',
        input: createSignupInput({ name: 'Aa', password: '12345678' }),
        expectedName: 'Aa',
        expectedEmail: 'test@example.com',
      },
      {
        description:
          'when_signup_uses_maximum_name_and_password_lengths_should_return_201_and_create_user',
        input: createSignupInput({ name: 'a'.repeat(100), password: 'a'.repeat(72) }),
        expectedName: 'a'.repeat(100),
        expectedEmail: 'test@example.com',
      },
      {
        description:
          'when_signup_uses_padded_name_and_uppercase_email_should_normalize_fields_and_return_201',
        input: createSignupInput({ name: '  Test User  ', email: '  TEST@EXAMPLE.COM  ' }),
        expectedName: 'Test User',
        expectedEmail: 'test@example.com',
      },
      {
        description: 'when_signup_uses_254_character_email_should_return_201_and_create_user',
        input: createSignupInput({
          email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
        }),
        expectedName: 'Test User',
        expectedEmail: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
      },
    ])('$description', async ({ input, expectedName, expectedEmail }) => {
      // Arrange

      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');

      const user = await findUserByEmail(expectedEmail);
      expect(user).not.toBeNull();
      expect(user?.name).toBe(expectedName);
      expect(user?.email).toBe(expectedEmail);
      expect(user?.imageUrl).toBeNull();
    });

    it('when_signup_includes_valid_image_should_upload_image_and_return_201', async () => {
      // Arrange
      const input = createSignupInput();
      const uploadedUrl = 'https://res.cloudinary.com/demo/image/upload/profile.jpg';
      const uploadSpy = vi
        .spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage')
        .mockResolvedValue({
          url: uploadedUrl,
          publicId: randomUUID(),
        });

      // Act
      const res = await signupWithImageRequest({
        filePath: VALID_JPEG_PATH,
        fields: input,
      });

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');
      expect(uploadSpy).toHaveBeenCalledOnce();

      const user = await findUserByEmail(input.email);
      expect(user).not.toBeNull();
      expect(user?.email).toBe(input.email);
      expect(user?.imageUrl).toBe(uploadedUrl);
    });
  });

  describe('Validation', () => {
    it.each(invalidSignupInputs)('$description', async ({ input, expectedDetail }) => {
      // Arrange
      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(400);
      expectValidationError(res, expectedDetail);
      expect(await findAllUsers()).toHaveLength(0);
    });

    it('when_signup_includes_unsupported_image_format_should_return_415_and_not_create_user', async () => {
      // Arrange
      const input = createSignupInput();

      // Act
      const res = await signupWithImageRequest({
        filePath: INVALID_FILE_PATH,
        fields: input,
      });

      // Assert
      expect(res.status).toBe(415);
      expect(res.body).toMatchObject({
        state: 'error',
        error: { code: 'UnSupportedImageTypeError' },
        data: null,
      });
      expect(await findUserByEmail(input.email)).toBeNull();
    });
  });

  describe('Business Logic', () => {
    it('when_signup_uses_existing_email_should_return_201_without_creating_duplicate_user', async () => {
      // Arrange
      const existingUser = await insertUser({
        name: 'Original User',
        email: 'duplicate@example.com',
      });
      const input = createSignupInput({
        name: 'New Attempt Name',
        email: 'duplicate@example.com',
        password: 'AnotherPassword123!',
      });

      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');

      const users = await findAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual(
        expect.objectContaining({
          _id: existingUser._id,
          name: 'Original User',
          email: 'duplicate@example.com',
          passwordHash: existingUser.passwordHash,
          status: 'ACTIVE',
        }),
      );
    });

    it('when_signup_uses_existing_email_with_different_casing_should_return_201_without_duplicate', async () => {
      // Arrange
      const existingUser = await insertUser({ email: 'case@example.com' });
      const input = createSignupInput({
        name: 'Duplicate Name',
        email: '  CASE@EXAMPLE.COM  ',
      });

      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');

      const users = await findAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0]?._id).toBe(existingUser._id);
    });

    it('when_signup_with_image_uses_existing_email_should_delete_uploaded_image_and_return_201', async () => {
      // Arrange
      const existingUser = await insertUser({ email: 'existing-image@example.com' });
      const publicId = randomUUID();
      vi.spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage').mockResolvedValue({
        url: 'https://res.cloudinary.com/demo/image/upload/orphan.jpg',
        publicId,
      });
      const deleteImageSpy = vi
        .spyOn(CloudinaryImageStorage.prototype, 'deleteImage')
        .mockResolvedValue();

      // Act
      const res = await signupWithImageRequest({
        filePath: VALID_JPEG_PATH,
        fields: createSignupInput({ email: existingUser.email }),
      });

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');
      expect(deleteImageSpy).toHaveBeenCalledOnce();
      expect(deleteImageSpy).toHaveBeenCalledWith(publicId);

      const users = await findAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0]?.imageUrl).toBeNull();
    });

    it('when_search_code_collides_once_should_retry_and_create_user', async () => {
      // Arrange
      const input = createSignupInput({ email: 'retry-code@example.com' });
      const createSpy = vi
        .spyOn(MongoUserRepository.prototype, 'create')
        .mockResolvedValueOnce({ status: 'SEARCH_CODE_TAKEN' });

      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(201);
      expectSuccessMessageResponse(res, 201, 'Signed up');
      expect(createSpy).toHaveBeenCalledTimes(2);

      const user = await findUserByEmail(input.email);
      expect(user).not.toBeNull();
    });
  });

  describe('Concurrency', () => {
    it('when_two_users_signup_with_same_email_concurrently_should_return_201_and_create_single_user', async () => {
      // Arrange
      const input = createSignupInput({ email: 'concurrent@example.com' });

      // Act
      const [res1, res2] = await Promise.all([signupRequest(input), signupRequest(input)]);

      // Assert
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expectSuccessMessageResponse(res1, 201, 'Signed up');
      expectSuccessMessageResponse(res2, 201, 'Signed up');

      const users = await findAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual(
        expect.objectContaining({
          name: input.name,
          email: input.email,
          imageUrl: null,
          status: 'ACTIVE',
        }),
      );
    });

    it('when_two_users_signup_with_different_emails_concurrently_should_create_both_users', async () => {
      // Arrange
      const inputA = createSignupInput({ email: 'user-a@example.com' });
      const inputB = createSignupInput({ email: 'user-b@example.com' });

      // Act
      const [res1, res2] = await Promise.all([signupRequest(inputA), signupRequest(inputB)]);

      // Assert
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expectSuccessMessageResponse(res1, 201, 'Signed up');
      expectSuccessMessageResponse(res2, 201, 'Signed up');

      const users = await findAllUsers();
      expect(users).toHaveLength(2);
      expect(users[0]?.searchCode).not.toBe(users[1]?.searchCode);
    });
  });

  describe('Server Error', () => {
    it('when_user_repository_fails_during_signup_should_return_500_and_not_create_user', async () => {
      // Arrange
      const input = createSignupInput({ email: 'server-error@example.com' });
      vi.spyOn(MongoUserRepository.prototype, 'create').mockRejectedValue(
        new Error('database unavailable'),
      );

      // Act
      const res = await signupRequest(input);

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(await findAllUsers()).toHaveLength(0);
    });

    it('when_user_repository_fails_after_image_upload_should_cleanup_image_and_return_500', async () => {
      // Arrange
      const input = createSignupInput({ email: 'cleanup-on-error@example.com' });
      const publicId = randomUUID();
      vi.spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage').mockResolvedValue({
        url: 'https://res.cloudinary.com/demo/image/upload/temp.jpg',
        publicId,
      });
      const deleteImageSpy = vi
        .spyOn(CloudinaryImageStorage.prototype, 'deleteImage')
        .mockResolvedValue();
      vi.spyOn(MongoUserRepository.prototype, 'create').mockRejectedValue(
        new Error('database unavailable'),
      );

      // Act
      const res = await signupWithImageRequest({
        filePath: VALID_JPEG_PATH,
        fields: input,
      });

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(deleteImageSpy).toHaveBeenCalledOnce();
      expect(deleteImageSpy).toHaveBeenCalledWith(publicId);
      expect(await findAllUsers()).toHaveLength(0);
    });

    it('when_image_cleanup_also_fails_after_create_error_should_still_return_500', async () => {
      // Arrange
      const input = createSignupInput({ email: 'cleanup-fails@example.com' });
      vi.spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage').mockResolvedValue({
        url: 'https://res.cloudinary.com/demo/image/upload/temp.jpg',
        publicId: randomUUID(),
      });
      vi.spyOn(CloudinaryImageStorage.prototype, 'deleteImage').mockRejectedValue(
        new Error('cloudinary delete failed'),
      );
      vi.spyOn(MongoUserRepository.prototype, 'create').mockRejectedValue(
        new Error('database unavailable'),
      );

      // Act
      const res = await signupWithImageRequest({
        filePath: VALID_JPEG_PATH,
        fields: input,
      });

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(await findAllUsers()).toHaveLength(0);
    });

    it('when_image_upload_fails_during_signup_should_return_500_and_not_create_user', async () => {
      // Arrange
      const input = createSignupInput({ email: 'upload-fails@example.com' });
      vi.spyOn(CloudinaryImageStorage.prototype, 'uploadProfileImage').mockRejectedValue(
        new Error('cloudinary unavailable'),
      );

      // Act
      const res = await signupWithImageRequest({
        filePath: VALID_JPEG_PATH,
        fields: input,
      });

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(await findAllUsers()).toHaveLength(0);
    });
  });
});
