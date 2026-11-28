import { beforeEach, describe } from 'vitest';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { it } from 'vitest';
import { insertUser } from '../../utils/user/query.js';
import { createLastMessageSeed } from '../../utils/conversation/factory.js';
import {
  insertDirectConversation,
  insertGroupConversation,
} from '../../utils/conversation/query.js';
import {
  DEFAULT_GROUP_IMAGE_URL,
  DEFAULT_GROUP_NAME,
  INVALID_UUID,
} from '../../utils/conversation/constants.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { getConversationDetailsRequest } from '../../utils/conversation/request.js';
import {
  expectForbiddenError,
  expectNotFoundError,
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { expect } from 'vitest';
import { randomUUID } from 'crypto';
import { vi } from 'vitest';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Get Conversation Details', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when group member requests details should return full group conversation details', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const member = await insertUser();
      const readAt = new Date('2026-01-10T10:00:00.000Z');
      const lastMessage = createLastMessageSeed(owner._id);

      const group = await insertGroupConversation({
        creatorId: owner._id,
        name: DEFAULT_GROUP_NAME,
        imageUrl: DEFAULT_GROUP_IMAGE_URL,
        lastMessage,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
          {
            userId: member._id,
            role: 'MEMBER',
            lastReadMessageId: lastMessage.messageId,
            lastReadAt: readAt,
          },
        ],
      });
      const token = await createAccessToken({ userId: member._id });

      // Act
      const res = await getConversationDetailsRequest(group._id, { token });

      // Assert
      expectSuccessDataResponse(
        res,
        200,
        expect.objectContaining({
          conversationId: group._id,
          type: 'GROUP',
          name: DEFAULT_GROUP_NAME,
          imageUrl: DEFAULT_GROUP_IMAGE_URL,
          creatorId: owner._id,
          lastMessage: {
            messageId: lastMessage.messageId,
            senderId: owner._id,
            contentPreview: lastMessage.contentPreview,
            createdAt: lastMessage.createdAt.toISOString(),
          },
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          members: expect.arrayContaining([
            expect.objectContaining({
              userId: owner._id,
              role: 'OWNER',
              lastReadMessageId: null,
              lastReadAt: null,
            }),
            expect.objectContaining({
              userId: admin._id,
              role: 'ADMIN',
              lastReadMessageId: null,
              lastReadAt: null,
            }),
            expect.objectContaining({
              userId: member._id,
              role: 'MEMBER',
              lastReadMessageId: lastMessage.messageId,
              lastReadAt: readAt.toISOString(),
            }),
          ]),
        }),
      );
      expect(res.body.data.members).toHaveLength(3);
    });

    it('when direct conversation participant requests details should return direct conversation details', async () => {
      // Arrange
      const userA = await insertUser();
      const userB = await insertUser();
      const direct = await insertDirectConversation({
        creatorId: userA._id,
        targetUserId: userB._id,
      });
      const token = await createAccessToken({ userId: userB._id });

      // Act
      const res = await getConversationDetailsRequest(direct._id, { token });

      // Assert
      expectSuccessDataResponse(
        res,
        200,
        expect.objectContaining({
          conversationId: direct._id,
          type: 'DIRECT',
          name: null,
          imageUrl: null,
          creatorId: userA._id,
          lastMessage: null,
          members: expect.arrayContaining([
            expect.objectContaining({ userId: userA._id, role: 'MEMBER' }),
            expect.objectContaining({ userId: userB._id, role: 'MEMBER' }),
          ]),
        }),
      );
    });
  });

  describe('Validation', () => {
    it('when conversationId is not a valid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationDetailsRequest(INVALID_UUID, { token });

      // Assert
      expectValidationError(res, 'conversationId');
    });
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      getConversationDetailsRequest(randomUUID(), { authorizationHeader }),
  });

  describe('Authorization', () => {
    it('when user is not a member of group conversation should return forbidden', async () => {
      // Arrange
      const owner = await insertUser();
      const outsider = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await getConversationDetailsRequest(group._id, { token });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
    });

    it('when user is not a participant of direct conversation should return forbidden', async () => {
      // Arrange
      const userA = await insertUser();
      const userB = await insertUser();
      const outsider = await insertUser();
      const direct = await insertDirectConversation({
        creatorId: userA._id,
        targetUserId: userB._id,
      });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await getConversationDetailsRequest(direct._id, { token });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
    });
  });

  describe('Business Logic', () => {
    it('when conversation does not exist should return not found', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await getConversationDetailsRequest(randomUUID(), { token });

      // Assert
      expectNotFoundError(res, 'Conversation not found');
    });

    it('when conversation is soft-deleted should return not found', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        deletedAt: new Date(),
      });
      const token = await createAccessToken({ userId: owner._id });

      // Act
      const res = await getConversationDetailsRequest(group._id, { token });

      // Assert
      expectNotFoundError(res, 'Conversation has been deleted');
    });
  });

  describe('Server Error', () => {
    it('when database fails during lookup should return server error', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });
      vi.spyOn(chatGroupModel, 'findById').mockImplementationOnce(() => {
        throw new Error('DB read failure');
      });

      // Act
      const res = await getConversationDetailsRequest(randomUUID(), { token });

      // Assert
      expectServerError(res);
    });
  });
});
