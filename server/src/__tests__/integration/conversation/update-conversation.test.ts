import { expect, vi } from 'vitest';
import {
  expectForbiddenError,
  expectNotFoundError,
  expectServerConflictError,
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import {
  findConversationById,
  insertDirectConversation,
  insertGroupConversation,
} from '../../utils/conversation/query.js';
import { insertUser } from '../../utils/user/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { chatGroupModel, truncateAll } from '../../utils/common/query.js';
import { it } from 'vitest';
import { updateConversationRequest } from '../../utils/conversation/request.js';
import { createUpdateConversationInput } from '../../utils/conversation/factory.js';
import {
  DEFAULT_GROUP_IMAGE_URL,
  DEFAULT_GROUP_NAME,
  INVALID_UUID,
  UPDATED_GROUP_IMAGE_URL,
  UPDATED_GROUP_NAME,
} from '../../utils/conversation/constants.js';
import { describe } from 'vitest';
import { randomUUID } from 'crypto';
import { invalidUpdateConversationInputs } from '../../utils/conversation/invalid-inputs.js';
import { beforeEach } from 'vitest';
import { setupConcurrentFindByIdBarrier } from '../../utils/conversation/concurrency.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Update Conversation', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when owner updates group name should update name and increment version', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        name: DEFAULT_GROUP_NAME,
        imageUrl: DEFAULT_GROUP_IMAGE_URL,
      });
      const token = await createAccessToken({ userId: owner._id });
      const input = createUpdateConversationInput({ name: `  ${UPDATED_GROUP_NAME}  ` });

      // Act
      const res = await updateConversationRequest(group._id, input, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        changes: {
          name: UPDATED_GROUP_NAME,
          imageUrl: DEFAULT_GROUP_IMAGE_URL,
        },
        updatedBy: owner._id,
        updatedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.name).toBe(UPDATED_GROUP_NAME);
      expect(updated?.imageUrl).toBe(DEFAULT_GROUP_IMAGE_URL);
      expect(updated?.version).toBe(1);
    });

    it('when admin updates imageUrl should update imageUrl and preserve existing name', async () => {
      // Arrange
      const owner = await insertUser();
      const admin = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        name: DEFAULT_GROUP_NAME,
        members: [
          { userId: owner._id, role: 'OWNER' },
          { userId: admin._id, role: 'ADMIN' },
        ],
      });
      const token = await createAccessToken({ userId: admin._id });
      const input = createUpdateConversationInput({ imageUrl: UPDATED_GROUP_IMAGE_URL });

      // Act
      const res = await updateConversationRequest(group._id, input, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        changes: {
          name: DEFAULT_GROUP_NAME,
          imageUrl: UPDATED_GROUP_IMAGE_URL,
        },
        updatedBy: admin._id,
        updatedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.name).toBe(DEFAULT_GROUP_NAME);
      expect(updated?.imageUrl).toBe(UPDATED_GROUP_IMAGE_URL);
      expect(updated?.version).toBe(1);
    });

    it('when owner clears imageUrl and name with null should persist null values', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({
        creatorId: owner._id,
        name: DEFAULT_GROUP_NAME,
        imageUrl: DEFAULT_GROUP_IMAGE_URL,
      });
      const token = await createAccessToken({ userId: owner._id });
      const input = createUpdateConversationInput({ name: null, imageUrl: null });

      // Act
      const res = await updateConversationRequest(group._id, input, { token });

      // Assert
      expectSuccessDataResponse(res, 200, {
        conversationId: group._id,
        changes: {
          name: null,
          imageUrl: null,
        },
        updatedBy: owner._id,
        updatedAt: expect.any(String),
      });

      const updated = await findConversationById(group._id);
      expect(updated?.name).toBeNull();
      expect(updated?.imageUrl).toBeNull();
      expect(updated?.version).toBe(1);
    });
  });

  describe('Validation', () => {
    it('when conversationId is invalid UUID should return bad request', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await updateConversationRequest(INVALID_UUID, createUpdateConversationInput(), {
        token,
      });

      // Assert
      expectValidationError(res, 'conversationId');
    });

    it.each(invalidUpdateConversationInputs)(
      'when $caseName should return bad request',
      async ({ payload, expectedDetail }) => {
        // Arrange
        const owner = await insertUser();
        const group = await insertGroupConversation({ creatorId: owner._id });
        const token = await createAccessToken({ userId: owner._id });

        // Act
        const res = await updateConversationRequest(group._id, payload, { token });

        // Assert
        expectValidationError(res, expectedDetail);
        const unchanged = await findConversationById(group._id);
        expect(unchanged?.name).toBe(DEFAULT_GROUP_NAME);
        expect(unchanged?.version).toBe(0);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      updateConversationRequest(randomUUID(), createUpdateConversationInput(), {
        authorizationHeader,
      }),
  });

  describe('Authorization', () => {
    it('when user is not a member of group should return forbidden and not modify database', async () => {
      // Arrange
      const owner = await insertUser();
      const outsider = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: outsider._id });

      // Act
      const res = await updateConversationRequest(group._id, createUpdateConversationInput(), {
        token,
      });

      // Assert
      expectForbiddenError(res, 'User is not a member of this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.name).toBe(DEFAULT_GROUP_NAME);
      expect(unchanged?.version).toBe(0);
    });

    it('when user is regular MEMBER should return forbidden and not modify database', async () => {
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
      const res = await updateConversationRequest(group._id, createUpdateConversationInput(), {
        token,
      });

      // Assert
      expectForbiddenError(res, 'Insufficient role permissions for this conversation');
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.name).toBe(DEFAULT_GROUP_NAME);
      expect(unchanged?.version).toBe(0);
    });
  });

  describe('Business Logic', () => {
    it('when conversation does not exist should return not found', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createAccessToken({ userId: user._id });

      // Act
      const res = await updateConversationRequest(randomUUID(), createUpdateConversationInput(), {
        token,
      });

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
      const res = await updateConversationRequest(group._id, createUpdateConversationInput(), {
        token,
      });

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
      const res = await updateConversationRequest(direct._id, createUpdateConversationInput(), {
        token,
      });

      // Assert
      expectServerConflictError(res, 'This action is not allowed on direct conversations');
    });
  });

  describe('Concurrency', () => {
    it('when two simultaneous updates occur on same conversation version should allow only one and return conflict for the other', async () => {
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
      const ownerToken = await createAccessToken({ userId: owner._id });
      const adminToken = await createAccessToken({ userId: admin._id });

      setupConcurrentFindByIdBarrier();

      // Act
      const [resOwner, resAdmin] = await Promise.all([
        updateConversationRequest(
          group._id,
          createUpdateConversationInput({ name: 'Owner Name' }),
          { token: ownerToken },
        ),
        updateConversationRequest(
          group._id,
          createUpdateConversationInput({ name: 'Admin Name' }),
          { token: adminToken },
        ),
      ]);

      // Assert
      const results = [resOwner, resAdmin];
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
      expect(saved?.name).toBe(succeeded[0].body.data.changes.name);
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
      const res = await updateConversationRequest(group._id, createUpdateConversationInput(), {
        token,
      });

      // Assert
      expectServerError(res);
    });

    it('when database fails on findOneAndUpdate should return server error and keep data unchanged', async () => {
      // Arrange
      const owner = await insertUser();
      const group = await insertGroupConversation({ creatorId: owner._id });
      const token = await createAccessToken({ userId: owner._id });
      vi.spyOn(chatGroupModel, 'findOneAndUpdate').mockImplementationOnce(() => {
        throw new Error('DB update failure');
      });

      // Act
      const res = await updateConversationRequest(group._id, createUpdateConversationInput(), {
        token,
      });

      // Assert
      expectServerError(res);
      const unchanged = await findConversationById(group._id);
      expect(unchanged?.name).toBe(DEFAULT_GROUP_NAME);
      expect(unchanged?.version).toBe(0);
    });
  });
});
