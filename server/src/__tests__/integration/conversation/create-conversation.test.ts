import { beforeEach, vi } from 'vitest';
import { describe } from 'vitest';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { it } from 'vitest';
import { insertUser } from '../../utils/user/query.js';
import { insertFriendship } from '../../utils/relationship/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import {
  createDirectConversationInput,
  createGroupConversationInput,
} from '../../utils/conversation/factory.js';
import { createConversationRequest } from '../../utils/conversation/request.js';
import {
  expectBadRequestError,
  expectServerConflictError,
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { expect } from 'vitest';
import {
  findAllConversations,
  findConversationById,
  findDirectConversationByUsers,
  insertDirectConversation,
} from '../../utils/conversation/query.js';
import { buildPairKey } from '../../utils/relationship/factory.js';
import { DEFAULT_GROUP_IMAGE_URL, DEFAULT_GROUP_NAME } from '../../utils/conversation/constants.js';
import { invalidCreateConversationInputs } from '../../utils/conversation/invalid-inputs.js';
import { randomUUID } from 'crypto';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Create Conversation', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when creating direct conversation with accepted friend should return created direct conversation', async () => {
      // Arrange
      const creator = await insertUser({ name: 'Creator User' });
      const friend = await insertUser({ name: 'Friend User' });
      await insertFriendship({
        requestedBy: creator._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const token = await createAccessToken({ userId: creator._id });
      const input = createDirectConversationInput(friend._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectSuccessDataResponse(
        res,
        201,
        expect.objectContaining({
          conversationId: expect.any(String),
          type: 'DIRECT',
          name: null,
          imageUrl: null,
          creatorId: creator._id,
          lastMessage: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          members: expect.arrayContaining([
            expect.objectContaining({
              userId: creator._id,
              role: 'MEMBER',
              joinedAt: expect.any(String),
              lastReadMessageId: null,
              lastReadAt: null,
            }),
            expect.objectContaining({
              userId: friend._id,
              role: 'MEMBER',
              joinedAt: expect.any(String),
              lastReadMessageId: null,
              lastReadAt: null,
            }),
          ]),
        }),
      );
      expect(res.body.data.members).toHaveLength(2);

      const saved = await findConversationById(res.body.data.conversationId);
      expect(saved).not.toBeNull();
      expect(saved?.type).toBe('DIRECT');
      expect(saved?.pairKey).toBe(buildPairKey(creator._id, friend._id));
      expect(saved?.members).toHaveLength(2);
      expect(saved?.version).toBe(0);
    });

    it('when creator was friendship recipient should still create direct conversation', async () => {
      // Arrange
      const requester = await insertUser({ name: 'Requester' });
      const recipient = await insertUser({ name: 'Recipient' });
      await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'ACCEPTED',
      });
      const token = await createAccessToken({ userId: recipient._id });
      const input = createDirectConversationInput(requester._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.state).toBe('success');
      expect(res.body.data.type).toBe('DIRECT');
      expect(res.body.data.creatorId).toBe(recipient._id);

      const saved = await findDirectConversationByUsers(requester._id, recipient._id);
      expect(saved).not.toBeNull();
      expect(saved?._id).toBe(res.body.data.conversationId);
    });

    it('when direct conversation already exists should return existing conversation without duplicating', async () => {
      // Arrange
      const userA = await insertUser({ name: 'User A' });
      const userB = await insertUser({ name: 'User B' });
      await insertFriendship({
        requestedBy: userA._id,
        recipient: userB._id,
        status: 'ACCEPTED',
      });
      const existing = await insertDirectConversation({
        creatorId: userB._id,
        targetUserId: userA._id,
      });
      const token = await createAccessToken({ userId: userA._id });
      const input = createDirectConversationInput(userB._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.state).toBe('success');
      expect(res.body.data.conversationId).toBe(existing._id);

      const all = await findAllConversations();
      expect(all).toHaveLength(1);
    });

    it('when creating group conversation without imageUrl should return created group with creator as owner', async () => {
      // Arrange
      const creator = await insertUser();
      const token = await createAccessToken({ userId: creator._id });
      const input = createGroupConversationInput({ name: `  ${DEFAULT_GROUP_NAME}  ` });

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectSuccessDataResponse(
        res,
        201,
        expect.objectContaining({
          conversationId: expect.any(String),
          type: 'GROUP',
          name: DEFAULT_GROUP_NAME,
          imageUrl: null,
          creatorId: creator._id,
          lastMessage: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          members: [
            expect.objectContaining({
              userId: creator._id,
              role: 'OWNER',
              joinedAt: expect.any(String),
              lastReadMessageId: null,
              lastReadAt: null,
            }),
          ],
        }),
      );

      const saved = await findConversationById(res.body.data.conversationId);
      expect(saved).not.toBeNull();
      expect(saved?.type).toBe('GROUP');
      expect(saved?.name).toBe(DEFAULT_GROUP_NAME);
      expect(saved?.imageUrl).toBeUndefined();
      expect(saved?.pairKey).toBeUndefined();
      expect(saved?.members).toHaveLength(1);
      expect(saved?.members[0]).toMatchObject({ userId: creator._id, role: 'OWNER' });
    });

    it('when creating group conversation with imageUrl should persist and return imageUrl', async () => {
      // Arrange
      const creator = await insertUser();
      const token = await createAccessToken({ userId: creator._id });
      const input = createGroupConversationInput({
        name: DEFAULT_GROUP_NAME,
        imageUrl: DEFAULT_GROUP_IMAGE_URL,
      });

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.data.imageUrl).toBe(DEFAULT_GROUP_IMAGE_URL);

      const saved = await findConversationById(res.body.data.conversationId);
      expect(saved?.imageUrl).toBe(DEFAULT_GROUP_IMAGE_URL);
    });

    it('when creating multiple group conversations with same name should create separate conversations', async () => {
      // Arrange
      const creator = await insertUser();
      const token = await createAccessToken({ userId: creator._id });
      const input = createGroupConversationInput({ name: DEFAULT_GROUP_NAME });

      // Act
      const res1 = await createConversationRequest(input, { token });
      const res2 = await createConversationRequest(input, { token });

      // Assert
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.data.conversationId).not.toBe(res2.body.data.conversationId);

      const all = await findAllConversations();
      expect(all).toHaveLength(2);
    });
  });

  describe('Validation', () => {
    it.each(invalidCreateConversationInputs)(
      'when $caseName should return bad request',
      async ({ payload, expectedDetail }) => {
        // Arrange
        const user = await insertUser();
        const token = await createAccessToken({ userId: user._id });

        // Act
        const res = await createConversationRequest(payload, { token });

        // Assert
        expectValidationError(res, expectedDetail);
        expect(await findAllConversations()).toHaveLength(0);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      createConversationRequest(createGroupConversationInput(), { authorizationHeader }),
  });

  describe('Business Logic', () => {
    it('when creating direct conversation with self should return conflict', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });
      const input = createDirectConversationInput(user._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectServerConflictError(res, 'Cannot create a direct conversation with yourself');
      expect(await findAllConversations()).toHaveLength(0);
    });

    it('when direct target user does not exist should return conflict', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });
      const input = createDirectConversationInput(randomUUID());

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectServerConflictError(res, 'Target user does not exist');
      expect(await findAllConversations()).toHaveLength(0);
    });

    it('when direct target user is DISABLED should return conflict', async () => {
      // Arrange
      const user = await insertUser();
      const disabledTarget = await insertUser({ status: 'DISABLED' });
      await insertFriendship({
        requestedBy: user._id,
        recipient: disabledTarget._id,
        status: 'ACCEPTED',
      });
      const token = await createAccessToken({ userId: user._id });
      const input = createDirectConversationInput(disabledTarget._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectServerConflictError(res, 'Target user is not active');
      expect(await findAllConversations()).toHaveLength(0);
    });

    it('when no friendship exists should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const stranger = await insertUser();
      const token = await createAccessToken({ userId: user._id });
      const input = createDirectConversationInput(stranger._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectBadRequestError(res, 'You can only start a direct conversation with a friend');
      expect(await findAllConversations()).toHaveLength(0);
    });

    it('when friendship is PENDING should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const pendingFriend = await insertUser();
      await insertFriendship({
        requestedBy: user._id,
        recipient: pendingFriend._id,
        status: 'PENDING',
      });
      const token = await createAccessToken({ userId: user._id });
      const input = createDirectConversationInput(pendingFriend._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectBadRequestError(res, 'You can only start a direct conversation with a friend');
      expect(await findAllConversations()).toHaveLength(0);
    });

    it('when friendship is REJECTED should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const rejectedUser = await insertUser();
      await insertFriendship({
        requestedBy: user._id,
        recipient: rejectedUser._id,
        status: 'REJECTED',
      });
      const token = await createAccessToken({ userId: user._id });
      const input = createDirectConversationInput(rejectedUser._id);

      // Act
      const res = await createConversationRequest(input, { token });

      // Assert
      expectBadRequestError(res, 'You can only start a direct conversation with a friend');
      expect(await findAllConversations()).toHaveLength(0);
    });
  });

  describe('Concurrency', () => {
    it('when both friends simultaneously create direct conversation should persist only one conversation', async () => {
      // Arrange
      const userA = await insertUser({ name: 'User A' });
      const userB = await insertUser({ name: 'User B' });
      await insertFriendship({
        requestedBy: userA._id,
        recipient: userB._id,
        status: 'ACCEPTED',
      });
      const tokenA = await createAccessToken({ userId: userA._id });
      const tokenB = await createAccessToken({ userId: userB._id });

      // Act
      const [resA, resB] = await Promise.all([
        createConversationRequest(createDirectConversationInput(userB._id), { token: tokenA }),
        createConversationRequest(createDirectConversationInput(userA._id), { token: tokenB }),
      ]);

      // Assert
      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
      expect(resA.body.data.conversationId).toBe(resB.body.data.conversationId);

      const all = await findAllConversations();
      expect(all).toHaveLength(1);
    });
  });

  describe('Server Error', () => {
    it('when database fails during group creation should return server error and persist nothing', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });
      vi.spyOn(chatGroupModel, 'create').mockRejectedValueOnce(new Error('DB write failure'));

      // Act
      const res = await createConversationRequest(createGroupConversationInput(), { token });

      // Assert
      expectServerError(res);
      expect(await findAllConversations()).toHaveLength(0);
    });

    it('when database fails during direct creation with non-duplicate error should return server error', async () => {
      // Arrange
      const user = await insertUser();
      const friend = await insertUser();
      await insertFriendship({
        requestedBy: user._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const token = await createAccessToken({ userId: user._id });
      vi.spyOn(chatGroupModel, 'create').mockRejectedValueOnce(new Error('DB write failure'));

      // Act
      const res = await createConversationRequest(createDirectConversationInput(friend._id), {
        token,
      });

      // Assert
      expectServerError(res);
      expect(await findAllConversations()).toHaveLength(0);
    });
  });
});
