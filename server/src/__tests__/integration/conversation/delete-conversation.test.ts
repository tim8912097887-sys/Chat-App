import { beforeEach, vi } from 'vitest';
import { describe } from 'vitest';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { it } from 'vitest';
import { insertUser } from '../../utils/user/query.js';
import {
  findConversationById,
  insertDirectConversation,
  insertGroupConversation,
} from '../../utils/conversation/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { deleteConversationRequest } from '../../utils/conversation/request.js';
import {
  expectForbiddenError,
  expectNotFoundError,
  expectServerConflictError,
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { expect } from 'vitest';
import { INVALID_UUID } from '../../utils/conversation/constants.js';
import { randomUUID } from 'crypto';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Delete Conversation', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when owner deletes group conversation should soft-delete and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        deletedAt: expect.any(String),
      });

      const saved = await findConversationById(group._id);
      expect(saved).not.toBeNull();
      expect(saved?.deletedAt).toBeInstanceOf(Date);
      expect(saved?.version).toBe(1);
    });
  });

  describe('Validation', () => {
    it('when conversationId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await deleteConversationRequest(INVALID_UUID, { token });

      // Assert
      expectValidationError(res, 'conversationId');
    });
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      deleteConversationRequest(randomUUID(), { authorizationHeader }),
  });

  describe('Authorization', () => {
    it('when user is not a member should return forbidden and not delete conversation', async () => {
      // Arrange
      const owner = await insertUser();
      const outsider = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.deletedAt ?? null).toBeNull();
      expect(unchanged?.version).toBe(0);
    });

    it('when ADMIN attempts to delete should return forbidden and not delete conversation', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
        ],
      });
      const token = await createAccessToken({ userId: admin._id });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.deletedAt ?? null).toBeNull();
    });

    it('when MEMBER attempts to delete should return forbidden and not delete conversation', async () => {
      // Arrange
      const owner = await insertUser();
      const member = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: member._id });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.deletedAt ?? null).toBeNull();
    });
  });

  describe('Business Logic', () => {
    it('when conversation does not exist should return not found', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await deleteConversationRequest(randomUUID(), { token });

      // Assert
      expectNotFoundError(res, 'Conversation not found');
    });

    it('when conversation is already soft-deleted should return not found', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        deletedAt: new Date(),
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectNotFoundError(res, 'Conversation has been deleted');
    });

    it('when conversation is DIRECT type should return conflict and not delete conversation', async () => {
      // Arrange
      const userA = await insertUser();
      const userB = await insertUser();
      const direct = await insertDirectConversation({
        creatorId: userA._id,
        targetUserId: userB._id,
      });
      const token = await createAccessToken({ userId: userA._id });

      // Act
      const res = await deleteConversationRequest(direct._id, { token });

      // Assert
      expectServerConflictError(res, 'This action is not allowed on direct conversations');
      const unchanged = await findConversationById(direct._id);
      expect(unchanged?.deletedAt ?? null).toBeNull();
    });
  });

  describe('Concurrency', () => {
    it('when owner sends two simultaneous delete requests should succeed once and return not found for the other', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const [resA, resB] = await Promise.all([
        deleteConversationRequest(group._id, { token }),
        deleteConversationRequest(group._id, { token }),
      ]);

      // Assert
      const results = [resA, resB];
      const succeeded = results.filter((r) => r.status === 200);
      const notFound = results.filter((r) => r.status === 404);

      expect(succeeded).toHaveLength(1);
      expect(notFound).toHaveLength(1);
      expectNotFoundError(notFound[0], 'Conversation has been deleted');

      const saved = await findConversationById(group._id);
      expect(saved?.deletedAt).toBeInstanceOf(Date);
      expect(saved?.version).toBe(1);
    });
  });

  describe('Server Error', () => {
    it('when database fails on findById should return server error', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findById').mockImplementationOnce(() => {
        throw new Error('DB read failure');
      });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectServerError(res);
    });

    it('when database fails on soft delete update should return server error and keep conversation active', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findOneAndUpdate').mockImplementationOnce(() => {
        throw new Error('DB delete failure');
      });

      // Act
      const res = await deleteConversationRequest(group._id, { token });

      // Assert
      expectServerError(res);
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.deletedAt ?? null).toBeNull();
      expect(unchanged?.version).toBe(0);
    });
  });
});
