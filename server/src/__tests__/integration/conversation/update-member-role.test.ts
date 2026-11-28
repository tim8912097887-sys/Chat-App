import { beforeEach, describe, expect } from 'vitest';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { it } from 'vitest';
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
import { createUpdateMemberRoleInput } from '../../utils/conversation/factory.js';
import { updateMemberRoleRequest } from '../../utils/conversation/request.js';
import { vi } from 'vitest';
import { invalidUpdateMemberRoleInputs } from '../../utils/conversation/invalid-inputs.js';
import { INVALID_UUID } from '../../utils/conversation/constants.js';
import { setupConcurrentFindByIdBarrier } from '../../utils/conversation/concurrency.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Update Member Role', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when owner promotes MEMBER to ADMIN should update member role and increment version', async () => {
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
      const res = await updateMemberRoleRequest(
        group._id,
        member._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        member: {
          userId: member._id,
          role: 'ADMIN',
        },
        updatedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      const updatedMember = updated?.members.find((m) => m.userId === member._id);
      expect(updatedMember?.role).toBe('ADMIN');
      expect(updated?.version).toBe(1);
    });

    it('when owner demotes ADMIN to MEMBER should update member role and increment version', async () => {
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
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await updateMemberRoleRequest(
        group._id,
        admin._id,
        createUpdateMemberRoleInput('MEMBER'),
        { token },
      );

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        member: {
          userId: admin._id,
          role: 'MEMBER',
        },
        updatedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      const updatedMember = updated?.members.find((m) => m.userId === admin._id);
      expect(updatedMember?.role).toBe('MEMBER');
      expect(updated?.version).toBe(1);
    });
  });

  describe('Validation', () => {
    it('when conversationId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await updateMemberRoleRequest(
        INVALID_UUID,
        randomUUID(),
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectValidationError(res, 'conversationId');
    });

    it('when memberId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await updateMemberRoleRequest(
        randomUUID(),
        INVALID_UUID,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectValidationError(res, 'memberId');
    });

    it.each(invalidUpdateMemberRoleInputs)(
      'when $caseName should return bad request',
      async ({ payload, expectedDetail }) => {
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
        const res = await updateMemberRoleRequest(group._id, member._id, payload, { token });

        // Assert
        expectValidationError(res, expectedDetail);
        const unchanged = await findConversationById(group._id);
        expect(unchanged?.members.find((m) => m.userId === member._id)?.role).toBe('MEMBER');
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      updateMemberRoleRequest(randomUUID(), randomUUID(), createUpdateMemberRoleInput('ADMIN'), {
        authorizationHeader,
      }),
  });

  describe('Authorization', () => {
    it('when non-member attempts to update role should return forbidden', async () => {
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
      const res = await updateMemberRoleRequest(
        group._id,
        member._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
    });

    it('when ADMIN attempts to update member role should return forbidden', async () => {
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
      const token = await createAccessToken({ userId: admin._id });

      // Act
      const res = await updateMemberRoleRequest(
        group._id,
        member._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members.find((m) => m.userId === member._id)?.role).toBe('MEMBER');
    });

    it('when MEMBER attempts to update member role should return forbidden', async () => {
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
      const res = await updateMemberRoleRequest(
        group._id,
        memberB._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
    });
  });

  describe('Business Logic', () => {
    it('when conversation does not exist should return not found', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await updateMemberRoleRequest(
        randomUUID(),
        randomUUID(),
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

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
      const res = await updateMemberRoleRequest(
        group._id,
        member._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

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
      const res = await updateMemberRoleRequest(
        direct._id,
        userB._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectServerConflictError(res, 'This action is not allowed on direct conversations');
    });

    it('when target user does not exist should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await updateMemberRoleRequest(
        group._id,
        randomUUID(),
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

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
      const res = await updateMemberRoleRequest(
        group._id,
        disabledMember._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectServerConflictError(res, 'Target user is not active');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members.find((m) => m.userId === disabledMember._id)?.role).toBe('MEMBER');
    });

    it('when target user is active but not a conversation member should return not found', async () => {
      // Arrange
      const owner = await insertUser();
      const nonMember = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await updateMemberRoleRequest(
        group._id,
        nonMember._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectNotFoundError(res, 'Target user is not a member of this conversation');
    });

    it('when owner attempts to change own OWNER role should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await updateMemberRoleRequest(
        group._id,
        owner._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectServerConflictError(res, 'You cannot update role yourself in a conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members.find((m) => m.userId === owner._id)?.role).toBe('OWNER');
    });

    it('when target member already has requested role should return conflict', async () => {
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
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await updateMemberRoleRequest(
        group._id,
        admin._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectServerConflictError(res, 'Member already has the specified role');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.version).toBe(0);
    });
  });

  describe('Concurrency', () => {
    it('when two simultaneous requests update different members roles should allow only one and conflict the other', async () => {
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
        updateMemberRoleRequest(group._id, memberA._id, createUpdateMemberRoleInput('ADMIN'), {
          token,
        }),
        updateMemberRoleRequest(group._id, memberB._id, createUpdateMemberRoleInput('ADMIN'), {
          token,
        }),
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
      expect(saved?.version).toBe(1);
      const adminCount = saved?.members.filter((m) => m.role === 'ADMIN').length;
      expect(adminCount).toBe(1);
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
      const res = await updateMemberRoleRequest(
        group._id,
        member._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectServerError(res);
    });

    it('when database fails on updateMemberRole should return server error and preserve existing role', async () => {
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
      const res = await updateMemberRoleRequest(
        group._id,
        member._id,
        createUpdateMemberRoleInput('ADMIN'),
        { token },
      );

      // Assert
      expectServerError(res);
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members.find((m) => m.userId === member._id)?.role).toBe('MEMBER');
      expect(unchanged?.version).toBe(0);
    });
  });
});
