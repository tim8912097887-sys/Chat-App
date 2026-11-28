import { beforeEach, expect, it, vi } from 'vitest';
import { describe } from 'vitest';
import { insertUser } from '../../utils/user/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import {
  expectForbiddenError,
  expectNotFoundError,
  expectServerConflictError,
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { randomUUID } from 'crypto';
import {
  findConversationById,
  insertDirectConversation,
  insertGroupConversation,
} from '../../utils/conversation/query.js';
import { leaveConversationRequest } from '../../utils/conversation/request.js';
import { INVALID_UUID } from '../../utils/conversation/constants.js';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { setupConcurrentFindByIdBarrier } from '../../utils/conversation/concurrency.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Leave Conversation', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when MEMBER leaves group conversation should remove member and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const member = await insertUser({
        name: 'Leaving Member',
        imageUrl: 'https://cdn.example.com/member.png',
      });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: member._id });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        removedMember: {
          userId: member._id,
          name: 'Leaving Member',
          imageUrl: 'https://cdn.example.com/member.png',
          role: 'MEMBER',
        },
        removedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(1);
      expect(updated?.members.some((m) => m.userId === member._id)).toBe(false);
      expect(updated?.version).toBe(1);
    });

    it('when ADMIN leaves group conversation should remove admin and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser({ name: 'Leaving Admin', imageUrl: null });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
        ],
      });
      const token = await createAccessToken({ userId: admin._id });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        removedMember: {
          userId: admin._id,
          name: 'Leaving Admin',
          imageUrl: null,
          role: 'ADMIN',
        },
        removedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(1);
      expect(updated?.version).toBe(1);
    });
  });

  describe('Validation', () => {
    it('when conversationId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await leaveConversationRequest(INVALID_UUID, { token });

      // Assert
      expectValidationError(res, 'conversationId');
    });
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      leaveConversationRequest(randomUUID(), { authorizationHeader }),
  });

  describe('Authorization', () => {
    it('when user is not a member of group should return forbidden', async () => {
      // Arrange
      const owner = await insertUser();
      const outsider = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(1);
    });
  });

  describe('Business Logic', () => {
    it('when conversation does not exist should return not found', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await leaveConversationRequest(randomUUID(), { token });

      // Assert
      expectNotFoundError(res, 'Conversation not found');
    });

    it('when conversation is soft-deleted should return not found', async () => {
      // Arrange
      const owner = await insertUser();
      const member = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        deletedAt: new Date(),
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: member._id });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectNotFoundError(res, 'Conversation has been deleted');
    });

    it('when conversation is DIRECT type should return conflict', async () => {
      // Arrange
      const userA = await insertUser();
      const userB = await insertUser();
      const direct = await insertDirectConversation({
        creatorId: userA._id,
        targetUserId: userB._id,
      });
      const token = await createAccessToken({ userId: userA._id });

      // Act
      const res = await leaveConversationRequest(direct._id, { token });

      // Assert
      expectServerConflictError(res, 'This action is not allowed on direct conversations');
      const unchanged = await findConversationById(direct._id);
      expect(unchanged?.members).toHaveLength(2);
    });

    it('when OWNER attempts to leave conversation should return conflict and keep owner in members', async () => {
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
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectServerConflictError(res, 'Conversation owner cannot leave the conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
      expect(unchanged?.version).toBe(0);
    });
  });

  describe('Concurrency', () => {
    it('when same member sends two simultaneous leave requests should succeed once and return forbidden for the other', async () => {
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
      const [resA, resB] = await Promise.all([
        leaveConversationRequest(group._id, { token }),
        leaveConversationRequest(group._id, { token }),
      ]);

      // Assert
      const results = [resA, resB];
      const succeeded = results.filter((r) => r.status === 200);
      const forbidden = results.filter((r) => r.status === 403);

      expect(succeeded).toHaveLength(1);
      expect(forbidden).toHaveLength(1);
      expectForbiddenError(forbidden[0], 'User is not a member of this conversation');

      const saved = await findConversationById(group._id);
      expect(saved?.members).toHaveLength(1);
      expect(saved?.version).toBe(1);
    });

    it('when two different members simultaneously leave should remove only one and conflict the other', async () => {
      // Arrange
      const owner = await insertUser();
      const memberA = await insertUser();
      const memberB = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: memberA._id, role: 'MEMBER' },
          { userId: memberB._id, role: 'MEMBER' },
        ],
      });
      const tokenA = await createAccessToken({ userId: memberA._id });
      const tokenB = await createAccessToken({ userId: memberB._id });

      setupConcurrentFindByIdBarrier();

      // Act
      const [resA, resB] = await Promise.all([
        leaveConversationRequest(group._id, { token: tokenA }),
        leaveConversationRequest(group._id, { token: tokenB }),
      ]);

      // Assert
      const results = [resA, resB];
      const succeeded = results.filter((r) => r.status === 200);
      const conflicted = results.filter((r) => r.status === 409);

      expect(succeeded).toHaveLength(1);
      expect(conflicted).toHaveLength(1);
      expectServerConflictError(
        conflicted[0],
        'Conversation has been modified. Please refresh and try again.',
      );

      const saved = await findConversationById(group._id);
      expect(saved?.members).toHaveLength(2);
      expect(saved?.version).toBe(1);
    });
  });

  describe('Server Error', () => {
    it('when database fails on findById should return server error', async () => {
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
      vi.spyOn(chatGroupModel, 'findById').mockImplementationOnce(() => {
        throw new Error('DB read failure');
      });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectServerError(res);
    });

    it('when database fails on removeGroupMember should return server error and keep member', async () => {
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
      vi.spyOn(chatGroupModel, 'findOneAndUpdate').mockImplementationOnce(() => {
        throw new Error('DB update failure');
      });

      // Act
      const res = await leaveConversationRequest(group._id, { token });

      // Assert
      expectServerError(res);
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
      expect(unchanged?.version).toBe(0);
    });
  });
});
