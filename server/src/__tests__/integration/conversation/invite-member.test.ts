import { beforeEach, it, vi } from 'vitest';
import { describe } from 'vitest';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { insertUser } from '../../utils/user/query.js';
import { insertFriendship } from '../../utils/relationship/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import {
  expectBadRequestError,
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
import { inviteMemberRequest } from '../../utils/conversation/request.js';
import { createInviteMemberInput } from '../../utils/conversation/factory.js';
import { INVALID_UUID } from '../../utils/conversation/constants.js';
import { invalidInviteMemberInputs } from '../../utils/conversation/invalid-inputs.js';
import { setupConcurrentFindByIdBarrier } from '../../utils/conversation/concurrency.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Invite Member', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when owner invites an accepted friend should add member with MEMBER role and return invited member', async () => {
      // Arrange
      const owner = await insertUser();
      const friend = await insertUser({
        name: 'Invited Friend',
        imageUrl: 'https://cdn.example.com/friend.png',
      });
      await insertFriendship({
        requestedBy: owner._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
        token,
      });

      // Assert
      expectSuccessDataResponse(res, 201, {
        conversationId: group._id,
        member: {
          userId: friend._id,
          name: 'Invited Friend',
          imageUrl: 'https://cdn.example.com/friend.png',
          role: 'MEMBER',
          joinedAt: expect.any(String),
          lastReadMessageId: null,
          lastReadAt: null,
        },
      });

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(2);
      expect(updated?.members.find((m) => m.userId === friend._id)).toMatchObject({
        userId: friend._id,
        role: 'MEMBER',
      });
      expect(updated?.version).toBe(1);
    });

    it('when admin invites a friend where admin was friendship recipient should add member', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const friend = await insertUser({ name: 'Friend User', imageUrl: null });
      await insertFriendship({
        requestedBy: friend._id,
        recipient: admin._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
        ],
      });
      const token = await createAccessToken({ userId: admin._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
        token,
      });

      // Assert
      expectSuccessDataResponse(res, 201, {
        conversationId: group._id,
        member: expect.objectContaining({
          userId: friend._id,
          name: 'Friend User',
          imageUrl: null,
          role: 'MEMBER',
        }),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.members).toHaveLength(3);
      expect(updated?.version).toBe(1);
    });
  });

  describe('Validation', () => {
    it('when conversationId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await inviteMemberRequest(INVALID_UUID, createInviteMemberInput(randomUUID()), {
        token,
      });

      // Assert
      expectValidationError(res, 'conversationId');
    });

    it.each(invalidInviteMemberInputs)(
      'when $caseName should return bad request',
      async ({ payload, expectedDetail }) => {
        // Arrange
        const owner = await insertUser();
        const group = await insertGroupConversation({ creatorId: owner._id });
        const token = await createAccessToken({ userId: owner._id });

        // Act
        const res = await inviteMemberRequest(group._id, payload, { token });

        // Assert
        expectValidationError(res, expectedDetail);
        const unchanged = await findConversationById(group._id);
        expect(unchanged?.members).toHaveLength(1);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      inviteMemberRequest(randomUUID(), createInviteMemberInput(), { authorizationHeader }),
  });

  describe('Authorization', () => {
    it('when non-member attempts to invite should return forbidden', async () => {
      // Arrange
      const owner = await insertUser();
      const outsider = await insertUser();
      const friend = await insertUser();
      await insertFriendship({
        requestedBy: outsider._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
        token,
      });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(1);
    });

    it('when regular MEMBER attempts to invite should return forbidden', async () => {
      // Arrange
      const owner = await insertUser();
      const member = await insertUser();
      const friend = await insertUser();
      await insertFriendship({
        requestedBy: member._id,
        recipient: friend._id,
        status: 'ACCEPTED',
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
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
        token,
      });

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
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
      const res = await inviteMemberRequest(randomUUID(), createInviteMemberInput(), { token });

      // Assert
      expectNotFoundError(res, 'Conversation not found');
    });

    it('when conversation is soft-deleted should return not found', async () => {
      // Arrange
      const owner = await insertUser();
      const friend = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        deletedAt: new Date(),
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
        token,
      });

      // Assert
      expectNotFoundError(res, 'Conversation has been deleted');
    });

    it('when conversation is DIRECT type should return conflict', async () => {
      // Arrange
      const userA = await insertUser();
      const userB = await insertUser();
      const userC = await insertUser();
      const direct = await insertDirectConversation({
        creatorId: userA._id,
        targetUserId: userB._id,
      });
      const token = await createAccessToken({ userId: userA._id });

      // Act
      const res = await inviteMemberRequest(direct._id, createInviteMemberInput(userC._id), {
        token,
      });

      // Assert
      expectServerConflictError(res, 'This action is not allowed on direct conversations');
    });

    it('when owner invites self should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(owner._id), {
        token,
      });

      // Assert
      expectServerConflictError(res, 'You cannot invite yourself to a conversation');
    });

    it('when target user does not exist should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(randomUUID()), {
        token,
      });

      // Assert
      expectServerConflictError(res, 'Target user does not exist');
    });

    it('when target user is DISABLED should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const disabledUser = await insertUser({ status: 'DISABLED' });
      await insertFriendship({
        requestedBy: owner._id,
        recipient: disabledUser._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(disabledUser._id), {
        token,
      });

      // Assert
      expectServerConflictError(res, 'Target user is not active');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(1);
    });

    it('when no friendship exists with target user should return bad request', async () => {
      // Arrange
      const owner = await insertUser();
      const stranger = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(stranger._id), {
        token,
      });

      // Assert
      expectBadRequestError(res, 'You can only invite a friend to a conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(1);
    });

    it('when friendship is PENDING should return bad request', async () => {
      // Arrange
      const owner = await insertUser();
      const pendingFriend = await insertUser();
      await insertFriendship({
        requestedBy: owner._id,
        recipient: pendingFriend._id,
        status: 'PENDING',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(pendingFriend._id), {
        token,
      });

      // Assert
      expectBadRequestError(res, 'You can only invite a friend to a conversation');
    });

    it('when friendship is REJECTED should return bad request', async () => {
      // Arrange
      const owner = await insertUser();
      const rejectedFriend = await insertUser();
      await insertFriendship({
        requestedBy: owner._id,
        recipient: rejectedFriend._id,
        status: 'REJECTED',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(
        group._id,
        createInviteMemberInput(rejectedFriend._id),
        { token },
      );

      // Assert
      expectBadRequestError(res, 'You can only invite a friend to a conversation');
    });

    it('when target user is already a member should return conflict', async () => {
      // Arrange
      const owner = await insertUser();
      const existingMember = await insertUser();
      await insertFriendship({
        requestedBy: owner._id,
        recipient: existingMember._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: existingMember._id, role: 'MEMBER' },
        ],
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await inviteMemberRequest(
        group._id,
        createInviteMemberInput(existingMember._id),
        { token },
      );

      // Assert
      expectServerConflictError(res, 'User is already a member of this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(2);
    });
  });

  describe('Concurrency', () => {
    it('when owner and admin simultaneously invite the same friend should add friend once and conflict the other', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const friend = await insertUser();
      await insertFriendship({
        requestedBy: owner._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      await insertFriendship({
        requestedBy: admin._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({
        creatorId: owner._id,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
        ],
      });
      const ownerToken = await createAccessToken({ userId: owner._id });
      const adminToken = await createAccessToken({ userId: admin._id });

      // Act
      const [resOwner, resAdmin] = await Promise.all([
        inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
          token: ownerToken,
        }),
        inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
          token: adminToken,
        }),
      ]);

      // Assert
      const results = [resOwner, resAdmin];
      const succeeded = results.filter((r) => r.status === 201);
      const conflicted = results.filter((r) => r.status === 409);

      expect(succeeded).toHaveLength(1);
      expect(conflicted).toHaveLength(1);
      expectServerConflictError(conflicted[0], 'User is already a member of this conversation');

      const saved = await findConversationById(group._id);
      expect(saved?.members).toHaveLength(3);
      expect(saved?.members.filter((m) => m.userId === friend._id)).toHaveLength(1);
      expect(saved?.version).toBe(1);
    });

    it('when two simultaneous invitations target different friends should add only one and conflict the other', async () => {
      // Arrange
      const owner = await insertUser();
      const friendA = await insertUser();
      const friendB = await insertUser();
      await insertFriendship({
        requestedBy: owner._id,
        recipient: friendA._id,
        status: 'ACCEPTED',
      });
      await insertFriendship({
        requestedBy: owner._id,
        recipient: friendB._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });

      setupConcurrentFindByIdBarrier();

      // Act
      const [resA, resB] = await Promise.all([
        inviteMemberRequest(group._id, createInviteMemberInput(friendA._id), { token }),
        inviteMemberRequest(group._id, createInviteMemberInput(friendB._id), { token }),
      ]);

      // Assert
      const results = [resA, resB];
      const succeeded = results.filter((r) => r.status === 201);
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
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findById').mockImplementationOnce(() => {
        throw new Error('DB read failure');
      });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(randomUUID()), {
        token,
      });

      // Assert
      expectServerError(res);
    });

    it('when database fails on addGroupMember should return server error and not add member', async () => {
      // Arrange
      const owner = await insertUser();
      const friend = await insertUser();
      await insertFriendship({
        requestedBy: owner._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findOneAndUpdate').mockImplementationOnce(() => {
        throw new Error('DB update failure');
      });

      // Act
      const res = await inviteMemberRequest(group._id, createInviteMemberInput(friend._id), {
        token,
      });

      // Assert
      expectServerError(res);
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.members).toHaveLength(1);
      expect(unchanged?.version).toBe(0);
    });
  });
});
