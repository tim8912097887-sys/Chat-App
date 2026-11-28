import { beforeEach, vi } from 'vitest';
import { describe } from 'vitest';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { insertUser } from '../../utils/user/query.js';
import { it } from 'vitest';
import { createAccessToken } from '../../utils/auth/factory.js';
import {
  expectForbiddenError,
  expectNotFoundError,
  expectServerConflictError,
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { expect } from 'vitest';
import { randomUUID } from 'crypto';
import {
  findConversationById,
  insertDirectConversation,
  insertGroupConversation,
} from '../../utils/conversation/query.js';
import { kickMemberRequest } from '../../utils/conversation/request.js';
import { INVALID_UUID } from '../../utils/conversation/constants.js';
import { setupConcurrentFindByIdBarrier } from '../../utils/conversation/concurrency.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Kick Member', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when OWNER kicks MEMBER should remove member and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const member = await insertUser({
        name: 'Target Member',
        imageUrl: 'https://cdn.example.com/target.png',
      });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, member._id, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        removedMember: {
          userId: member._id,
          name: 'Target Member',
          imageUrl: 'https://cdn.example.com/target.png',
          role: 'MEMBER',
        },
        removedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(1);
      expect(updated?.members.some((m) => m.userId === member._id)).toBe(false);
      expect(updated?.version).toBe(1);
    });

    it('when OWNER kicks ADMIN should remove admin and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser({ name: 'Target Admin', imageUrl: null });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
        ],
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, admin._id, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        removedMember: {
          userId: admin._id,
          name: 'Target Admin',
          imageUrl: null,
          role: 'ADMIN',
        },
        removedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(1);
      expect(updated?.version).toBe(1);
    });

    it('when ADMIN kicks MEMBER should remove member and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const member = await insertUser({ name: 'Kicked Member' });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: admin._id });

      // Act
      const res = await kickMemberRequest(group._id, member._id, { token });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.removedMember.userId).toBe(member._id);
      expect(res.body.data.removedMember.role).toBe('MEMBER');

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(2);
      expect(updated?.members.some((m) => m.userId === member._id)).toBe(false);
      expect(updated?.version).toBe(1);
    });
  });

  describe('Validation', () => {
    it('when conversationId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await kickMemberRequest(INVALID_UUID, randomUUID(), { token });

      // Assert
      expectValidationError(res, 'conversationId');
    });

    it('when memberId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await kickMemberRequest(randomUUID(), INVALID_UUID, { token });

      // Assert
      expectValidationError(res, 'memberId');
    });
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      kickMemberRequest(randomUUID(), randomUUID(), { authorizationHeader }),
  });

  describe('Authorization', () => {
    it('when non-member attempts to kick should return forbidden', async () => {
      // Arrange
      const owner = await insertUser();
      const member = await insertUser();
      const outsider = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await kickMemberRequest(group._id, member._id, { token });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
    });

    it('when MEMBER attempts to kick another MEMBER should return forbidden', async () => {
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
      const token = await createAccessToken({ userId: memberA._id });

      // Act
      const res = await kickMemberRequest(group._id, memberB._id, { token });

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(3);
    });

    it('when ADMIN attempts to kick another ADMIN should return forbidden', async () => {
      // Arrange
      const owner = await insertUser();
      const adminA = await insertUser();
      const adminB = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: adminA._id, role: 'ADMIN' },
          { userId: adminB._id, role: 'ADMIN' },
        ],
      });
      const token = await createAccessToken({ userId: adminA._id });

      // Act
      const res = await kickMemberRequest(group._id, adminB._id, { token });

      // Assert
      expectForbiddenError(
        res,
        'You do not have permission to kick a member with a higher or equal role',
      );
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(3);
    });

    it('when ADMIN attempts to kick OWNER should return forbidden', async () => {
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
      const res = await kickMemberRequest(group._id, owner._id, { token });

      // Assert
      expectForbiddenError(
        res,
        'You do not have permission to kick a member with a higher or equal role',
      );
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
    });
  });

  describe('Business Logic', () => {
    it('when conversation does not exist should return not found', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await kickMemberRequest(randomUUID(), randomUUID(), { token });

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
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, member._id, { token });

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
      const res = await kickMemberRequest(direct._id, userB._id, { token });

      // Assert
      expectServerConflictError(res, 'This action is not allowed on direct conversations');
    });

    it('when OWNER attempts to kick self should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, owner._id, { token });

      // Assert
      expectServerConflictError(res, 'You cannot kick yourself from a conversation');
    });

    it('when ADMIN attempts to kick self should return conflict', async () => {
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
      const res = await kickMemberRequest(group._id, admin._id, { token });

      // Assert
      expectServerConflictError(res, 'You cannot kick yourself from a conversation');
    });

    it('when target user does not exist should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, randomUUID(), { token });

      // Assert
      expectServerConflictError(res, 'Target user does not exist');
    });

    it('when target user is DISABLED should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const disabledMember = await insertUser({ status: 'DISABLED' });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: disabledMember._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, disabledMember._id, { token });

      // Assert
      expectServerConflictError(res, 'Target user is not active');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
    });

    it('when target user is active but not a conversation member should return not found', async () => {
      // Arrange
      const owner = await insertUser();
      const nonMember = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await kickMemberRequest(group._id, nonMember._id, { token });

      // Assert
      expectNotFoundError(res, 'Target user is not a member of this conversation');
    });
  });

  describe('Concurrency', () => {
    it('when owner and admin simultaneously kick the same member should succeed once and return not found for the other', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const member = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
          { userId: member._id, role: 'MEMBER' },
        ],
      });
      const ownerToken = await createAccessToken({ userId: owner._id });
      const adminToken = await createAccessToken({ userId: admin._id });

      // Act
      const [resOwner, resAdmin] = await Promise.all([
        kickMemberRequest(group._id, member._id, { token: ownerToken }),
        kickMemberRequest(group._id, member._id, { token: adminToken }),
      ]);

      // Assert
      const results = [resOwner, resAdmin];
      const succeeded = results.filter((r) => r.status === 200);
      const notFound = results.filter((r) => r.status === 404);

      expect(succeeded).toHaveLength(1);
      expect(notFound).toHaveLength(1);
      expectNotFoundError(notFound[0], 'Target user is not a member of this conversation');

      const saved = await findConversationById(group._id);
      expect(saved?.members).toHaveLength(2);
      expect(saved?.members.some((m) => m.userId === member._id)).toBe(false);
      expect(saved?.version).toBe(1);
    });

    it('when owner simultaneously kicks two different members should remove only one and conflict the other', async () => {
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
      const token = await createAccessToken({ userId: owner._id });

      setupConcurrentFindByIdBarrier();

      // Act
      const [resA, resB] = await Promise.all([
        kickMemberRequest(group._id, memberA._id, { token }),
        kickMemberRequest(group._id, memberB._id, { token }),
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
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findById').mockImplementationOnce(() => {
        throw new Error('DB read failure');
      });

      // Act
      const res = await kickMemberRequest(group._id, member._id, { token });

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
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findOneAndUpdate').mockImplementationOnce(() => {
        throw new Error('DB update failure');
      });

      // Act
      const res = await kickMemberRequest(group._id, member._id, { token });

      // Assert
      expectServerError(res);
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
      expect(unchanged?.version).toBe(0);
    });
  });
});
