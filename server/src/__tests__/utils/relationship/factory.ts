import { randomUUID } from 'node:crypto';
import { CreateFriendRequestBody } from '../../../domain/relationship/dto/create-friend-request.js';
import { UpdateFriendRequestBody } from '../../../domain/relationship/dto/update-friend-request.js';
import { FriendRequestQuery } from '../../../domain/relationship/dto/get-friend-requests.js';

export type FriendshipSeedStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface CreateFriendshipSeedOptions {
  id?: string;
  requestedBy: string;
  recipient: string;
  status?: FriendshipSeedStatus;
  updatedAt?: Date;
}

export function buildPairKey(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join(':');
}

export function buildFriendshipSeedData(options: CreateFriendshipSeedOptions) {
  return {
    id: options.id ?? randomUUID(),
    requestedBy: options.requestedBy,
    recipient: options.recipient,
    status: options.status ?? ('PENDING' as const),
    pairKey: buildPairKey(options.requestedBy, options.recipient),
    updatedAt: options.updatedAt,
  };
}

export function createInviteFriendInput(
  overrides: Partial<CreateFriendRequestBody> = {},
): CreateFriendRequestBody {
  return {
    targetUserId: overrides.targetUserId ?? randomUUID(),
  };
}

export function createUpdateFriendRequestInput(
  overrides: Partial<UpdateFriendRequestBody> = {},
): UpdateFriendRequestBody {
  return {
    requesterId: overrides.requesterId ?? randomUUID(),
  };
}

export function createFriendRequestQuery(
  overrides: Partial<FriendRequestQuery> = {},
): Partial<FriendRequestQuery> {
  return {
    direction: 'incoming',
    ...overrides,
  };
}
