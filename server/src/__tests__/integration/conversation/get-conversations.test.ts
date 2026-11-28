import { describe } from 'vitest';
import { chatGroupModel, truncateAll, userModel } from '../../utils/common/query.js';
import { it } from 'vitest';
import { insertUser } from '../../utils/user/query.js';
import {
  createGetConversationsQuery,
  createLastMessageSeed,
} from '../../utils/conversation/factory.js';
import {
  insertDirectConversation,
  insertGroupConversation,
} from '../../utils/conversation/query.js';
import {
  DEFAULT_GROUP_IMAGE_URL,
  DEFAULT_GROUP_NAME,
  MAX_CONVERSATIONS_LIMIT,
  MAX_CONVERSATIONS_OFFSET,
} from '../../utils/conversation/constants.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { getConversationsRequest } from '../../utils/conversation/request.js';
import {
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { expect } from 'vitest';
import { vi } from 'vitest';
import { invalidGetConversationsQueries } from '../../utils/conversation/invalid-inputs.js';
import { beforeEach } from 'vitest';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Get Conversations', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when user has no conversations should return empty list', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expectSuccessDataResponse(res, 200, []);
    });

    it('when user has direct and group conversations should return formatted conversations ordered by updatedAt desc', async () => {
      // Arrange
      const user = await insertUser({
        name: 'Auth User',
        imageUrl: 'https://cdn.example.com/me.png',
      });
      const friend = await insertUser({
        name: 'Friend Alice',
        imageUrl: 'https://cdn.example.com/alice.png',
      });
      const olderTime = new Date('2026-01-01T10:00:00.000Z');
      const newerTime = new Date('2026-01-02T10:00:00.000Z');
      const lastMessage = createLastMessageSeed(friend._id, {
        contentPreview: 'Hey there!',
        createdAt: newerTime,
      });

      const groupConv = await insertGroupConversation({
        creatorId: user._id,
        name: DEFAULT_GROUP_NAME,
        imageUrl: DEFAULT_GROUP_IMAGE_URL,
        updatedAt: olderTime,
      });
      const directConv = await insertDirectConversation({
        creatorId: user._id,
        targetUserId: friend._id,
        lastMessage,
        updatedAt: newerTime,
      });

      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expectSuccessDataResponse(res, 200, [
        {
          conversationId: directConv._id,
          type: 'DIRECT',
          name: 'Friend Alice',
          imageUrl: 'https://cdn.example.com/alice.png',
          lastMessage: {
            messageId: lastMessage.messageId,
            senderId: friend._id,
            contentPreview: 'Hey there!',
            createdAt: newerTime.toISOString(),
          },
          updatedAt: expect.any(String),
        },
        {
          conversationId: groupConv._id,
          type: 'GROUP',
          name: DEFAULT_GROUP_NAME,
          imageUrl: DEFAULT_GROUP_IMAGE_URL,
          lastMessage: null,
          updatedAt: expect.any(String),
        },
      ]);
    });

    it('when conversations belong to other users or are soft-deleted should exclude them', async () => {
      // Arrange
      const user = await insertUser();
      const otherA = await insertUser();
      const otherB = await insertUser();

      const visibleGroup = await insertGroupConversation({
        creatorId: user._id,
        name: 'Visible Group',
      });
      await insertGroupConversation({
        creatorId: user._id,
        name: 'Deleted Group',
        deletedAt: new Date(),
      });
      await insertGroupConversation({
        creatorId: otherA._id,
        name: 'Unrelated Group',
      });
      await insertDirectConversation({
        creatorId: otherA._id,
        targetUserId: otherB._id,
      });

      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('success');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].conversationId).toBe(visibleGroup._id);
    });

    it('when direct conversation partner is DISABLED should return null name and imageUrl', async () => {
      // Arrange
      const user = await insertUser();
      const disabledPartner = await insertUser({
        name: 'Disabled Partner',
        imageUrl: 'https://cdn.example.com/disabled.png',
        status: 'DISABLED',
      });
      const directConv = await insertDirectConversation({
        creatorId: user._id,
        targetUserId: disabledPartner._id,
      });
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expectSuccessDataResponse(res, 200, [
        expect.objectContaining({
          conversationId: directConv._id,
          type: 'DIRECT',
          name: null,
          imageUrl: null,
        }),
      ]);
    });

    it('when updatedAt ties should sort deterministically by _id ascending', async () => {
      // Arrange
      const user = await insertUser();
      const sameTime = new Date('2026-02-01T12:00:00.000Z');
      const convB = await insertGroupConversation({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        creatorId: user._id,
        name: 'Group B',
        updatedAt: sameTime,
      });
      const convA = await insertGroupConversation({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        creatorId: user._id,
        name: 'Group A',
        updatedAt: sameTime,
      });
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.map((c: { conversationId: string }) => c.conversationId)).toEqual([
        convA._id,
        convB._id,
      ]);
    });

    it('when offset and limit are provided should paginate results properly', async () => {
      // Arrange
      const user = await insertUser();
      const conv1 = await insertGroupConversation({
        creatorId: user._id,
        name: 'Conv 1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      const conv2 = await insertGroupConversation({
        creatorId: user._id,
        name: 'Conv 2',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });
      const conv3 = await insertGroupConversation({
        creatorId: user._id,
        name: 'Conv 3',
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      });
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationsRequest(
        createGetConversationsQuery({ offset: 1, limit: 1 }),
        { token },
      );

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].conversationId).toBe(conv2._id);
      expect(conv1._id).not.toBe(conv3._id);
    });

    it('when pagination uses boundary values should succeed', async () => {
      // Arrange
      const user = await insertUser();
      await insertGroupConversation({ creatorId: user._id });
      const token = await createAccessToken({ userId: user._id });

      // Act
      const resMaxLimit = await getConversationsRequest(
        createGetConversationsQuery({ offset: 0, limit: MAX_CONVERSATIONS_LIMIT }),
        { token },
      );
      const resMaxOffset = await getConversationsRequest(
        createGetConversationsQuery({ offset: MAX_CONVERSATIONS_OFFSET, limit: 1 }),
        { token },
      );

      // Assert
      expect(resMaxLimit.status).toBe(200);
      expect(resMaxLimit.body.data).toHaveLength(1);
      expect(resMaxOffset.status).toBe(200);
      expect(resMaxOffset.body.data).toEqual([]);
    });
  });

  describe('Validation', () => {
    it.each(invalidGetConversationsQueries)(
      'when $caseName should return bad request',
      async ({ query, expectedDetail }) => {
        // Arrange
        const user = await insertUser();
        const token = await createAccessToken({ userId: user._id });

        // Act
        const res = await getConversationsRequest(query, { token });

        // Assert
        expectValidationError(res, expectedDetail);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) => getConversationsRequest({}, { authorizationHeader }),
  });

  describe('Server Error', () => {
    it('when chatGroupModel find fails should return server error', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });
      vi.spyOn(chatGroupModel, 'find').mockImplementationOnce(() => {
        throw new Error('DB read failure');
      });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expectServerError(res);
    });

    it('when userModel find fails while resolving direct partners should return server error', async () => {
      // Arrange
      const user = await insertUser();
      const friend = await insertUser();
      await insertDirectConversation({ creatorId: user._id, targetUserId: friend._id });
      const token = await createAccessToken({ userId: user._id });
      vi.spyOn(userModel, 'find').mockImplementationOnce(() => {
        throw new Error('User lookup failure');
      });

      // Act
      const res = await getConversationsRequest({}, { token });

      // Assert
      expectServerError(res);
    });
  });
});
