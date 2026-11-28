import { RealtimeEventPublisher } from '../../realtime/realtime-event-publisher.js';
import { RelationshipRepository } from '../relationship/relationship.repository.js';
import { UserNotActiveError, UserNotExistError } from '../user/error/user.js';
import { UserDocument } from '../user/user.model.js';
import { UserRepository } from '../user/user.repository.js';
import { PublicUserRecord } from '../user/user.types.js';
import { ChatGroupDocument, ChatGroupMembersDocument, MemberRole } from './chat-group.model.js';
import { ConversationRepository } from './conversation.repository.js';
import { UpdateConversationMemberRoleBody } from './dto/update-member-role.js';
import { CreateConversationBody, ReturnConversationDto } from './dto/create-conversation.js';
import { ReturnConversationDto as ConversationDetailsDto } from './dto/get-conversation-details.js';
import { DeleteConversationDto } from './dto/delete-conversation.js';
import { GetAllConversationsDto, GetConversationsQuery } from './dto/get-conversations.js';
import { AddConversationMemberBody } from './dto/invite-member.js';
import { InviteMemberDto } from './dto/invite-member.js';
import { RemoveMemberDto } from './dto/remove-member.js';
import { UpdateConversationDto } from './dto/update-conversation.js';
import { UpdateConversationBody } from './dto/update-conversation.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.js';
import {
  CannotCreateDirectConversationWithSelfError,
  ConversationConflictError,
  ConversationDeletedError,
  ConversationNotFoundError,
  DirectConversationActionNotAllowedError,
} from './error/conversation.js';
import {
  CannotInviteSelfError,
  CannotKickSelfError,
  CannotLeaveAsOwnerError,
  CannotUpdateSelfRoleError,
  MemberAlreadyExistsError,
  MemberNotFoundError,
  NotConversationMemberError,
} from './error/membership.js';
import {
  CannotChangeOwnerRoleError,
  CannotKickHigherOrEqualRoleError,
  InsufficientConversationRoleError,
  RoleUnchangedError,
} from './error/permission.js';
import { NotFriendError } from '../relationship/error/relationship.js';

interface ValidateConversationOptions {
  requireGroupType?: boolean;
  allowedRoles?: MemberRole[];
}

interface ValidatedConversationContext {
  conversation: ChatGroupDocument;
  member: ChatGroupMembersDocument;
}

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

interface MutationFailureOptions {
  actorId?: string;
  allowedActorRoles?: MemberRole[];

  targetMemberId?: string;
  targetMustExist?: boolean;
  targetMustNotExist?: boolean;

  targetMustNotBeOwner?: boolean;
  targetRoleMustDifferFrom?: MemberRole;
  targetMustHaveLowerRoleThanActor?: boolean;
}

export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly userRepository: UserRepository,
    private readonly realtimeEvents: RealtimeEventPublisher,
  ) {}

  async createConversation(
    authUserId: string,
    input: CreateConversationBody,
  ): Promise<ReturnConversationDto> {
    if (input.type === 'DIRECT') {
      if (input.targetUserId === authUserId) {
        throw new CannotCreateDirectConversationWithSelfError();
      }

      const targetUser = await this.userRepository.findById(input.targetUserId);
      if (!targetUser) {
        throw new UserNotExistError('Target user does not exist');
      }
      if (targetUser.status !== 'ACTIVE') {
        throw new UserNotActiveError('Target user is not active');
      }

      const pairKey = this.buildPairKey(authUserId, input.targetUserId);
      const friendship = await this.relationshipRepository.findByPairKey(pairKey);
      if (!friendship || friendship.status !== 'ACCEPTED') {
        throw new NotFriendError('You can only start a direct conversation with a friend');
      }

      const { conversation } = await this.conversationRepository.createDirectConversation({
        creatorId: authUserId,
        pairKey,
        memberIds: [authUserId, input.targetUserId],
      });

      const dto = ReturnConversationDto.toDomainConversation(conversation);

      return dto;
    }

    // GROUP conversation

    const now = new Date();
    const members = [
      {
        userId: authUserId,
        role: 'OWNER' as const,
        joinedAt: now,
      },
    ];

    const conversation = await this.conversationRepository.createGroupConversation({
      creatorId: authUserId,
      name: input.name,
      imageUrl: input.imageUrl,
      members,
    });

    const dto = ReturnConversationDto.toDomainConversation(conversation);

    return dto;
  }

  async getConversations(
    authUserId: string,
    pagination: GetConversationsQuery,
  ): Promise<GetAllConversationsDto[]> {
    const conversations = await this.conversationRepository.findByUserId(authUserId, pagination);

    const directFriendIds = Array.from(
      new Set(
        conversations
          .filter((conv) => conv.type === 'DIRECT')
          .map((conv) => conv.members.find((m) => m.userId !== authUserId)?.userId)
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );

    const publicUsers =
      directFriendIds.length > 0
        ? await this.userRepository.findPublicUsersByIds(directFriendIds)
        : [];

    const userMap = new Map<string, PublicUserRecord>(
      publicUsers.map((user) => [user._id.toString(), user]),
    );

    return conversations.map((conversation) => {
      if (conversation.type === 'DIRECT') {
        const friendMember = conversation.members.find((m) => m.userId !== authUserId);
        const friendUser = friendMember ? userMap.get(friendMember.userId) : undefined;

        return GetAllConversationsDto.toDomainConversation(
          conversation,
          friendUser?.name ?? null,
          friendUser?.imageUrl ?? null,
        );
      }

      return GetAllConversationsDto.toDomainConversation(
        conversation,
        conversation.name ?? null,
        conversation.imageUrl ?? null,
      );
    });
  }

  async getConversationDetails(
    authUserId: string,
    conversationId: string,
  ): Promise<ConversationDetailsDto> {
    const { conversation } = await this.validateConversationAccess(conversationId, authUserId, {
      requireGroupType: false,
    });

    return ReturnConversationDto.toDomainConversation(conversation);
  }

  async updateConversation(
    authUserId: string,
    conversationId: string,
    input: UpdateConversationBody,
  ): Promise<UpdateConversationDto> {
    const { conversation } = await this.validateConversationAccess(conversationId, authUserId, {
      requireGroupType: true,
      allowedRoles: ['OWNER', 'ADMIN'],
    });

    const updatedConversation = await this.conversationRepository.updateGroupConversation(
      conversationId,
      conversation.version,
      input,
    );
    if (!updatedConversation) {
      return this.throwMutationFailure(conversationId, {
        actorId: authUserId,
        allowedActorRoles: ['OWNER', 'ADMIN'],
      });
    }

    const dto = UpdateConversationDto.toDomainConversationUpdated(
      updatedConversation._id.toString(),
      {
        name: updatedConversation.name ?? null,
        imageUrl: updatedConversation.imageUrl ?? null,
      },
      authUserId,
      new Date(updatedConversation.updatedAt),
    );

    return dto;
  }

  async deleteConversation(
    authUserId: string,
    conversationId: string,
  ): Promise<DeleteConversationDto> {
    const { conversation } = await this.validateConversationAccess(conversationId, authUserId, {
      requireGroupType: true,
      allowedRoles: ['OWNER'],
    });

    const deletedAt = new Date();
    const deletedConversation = await this.conversationRepository.softDeleteGroupConversation(
      conversationId,
      conversation.version,
      deletedAt,
    );
    if (!deletedConversation) {
      return this.throwMutationFailure(conversationId, {
        actorId: authUserId,
        allowedActorRoles: ['OWNER'],
      });
    }

    const dto = DeleteConversationDto.toDomainConversationDeleted(
      deletedConversation._id.toString(),
      deletedConversation.deletedAt ?? deletedAt,
    );

    return dto;
  }

  async updateMemberRole(
    authUserId: string,
    conversationId: string,
    memberId: string,
    input: UpdateConversationMemberRoleBody,
  ): Promise<UpdateMemberRoleDto> {
    const { conversation } = await this.validateConversationAccess(conversationId, authUserId, {
      requireGroupType: true,
      allowedRoles: ['OWNER'],
    });

    if (authUserId === memberId) {
      throw new CannotUpdateSelfRoleError();
    }

    const targetUser = await this.userRepository.findById(memberId);
    if (!targetUser) {
      throw new UserNotExistError('Target user does not exist');
    }
    if (targetUser.status !== 'ACTIVE') {
      throw new UserNotActiveError('Target user is not active');
    }

    const targetMember = conversation.members.find((m) => m.userId === memberId);
    if (!targetMember) {
      throw new MemberNotFoundError();
    }

    if (targetMember.role === 'OWNER') {
      throw new CannotChangeOwnerRoleError();
    }

    if (targetMember.role === input.role) {
      throw new RoleUnchangedError();
    }

    const updatedConversation = await this.conversationRepository.updateMemberRole(
      conversationId,
      conversation.version,
      memberId,
      input.role,
    );
    if (!updatedConversation) {
      return this.throwMutationFailure(conversationId, {
        actorId: authUserId,
        allowedActorRoles: ['OWNER'],
        targetMemberId: memberId,
        targetMustExist: true,
        targetMustNotBeOwner: true,
        targetRoleMustDifferFrom: input.role,
      });
    }

    return UpdateMemberRoleDto.toDomainMemberRoleUpdated(
      updatedConversation._id.toString(),
      memberId,
      input.role,
      new Date(updatedConversation.updatedAt),
    );
  }

  async inviteMember(
    authUserId: string,
    conversationId: string,
    input: AddConversationMemberBody,
  ): Promise<InviteMemberDto> {
    const { conversation } = await this.validateConversationAccess(conversationId, authUserId, {
      requireGroupType: true,
      allowedRoles: ['OWNER', 'ADMIN'],
    });

    if (input.userId === authUserId) {
      throw new CannotInviteSelfError();
    }

    const targetUser = await this.userRepository.findById(input.userId);
    if (!targetUser) {
      throw new UserNotExistError('Target user does not exist');
    }
    if (targetUser.status !== 'ACTIVE') {
      throw new UserNotActiveError('Target user is not active');
    }

    const friendship = await this.relationshipRepository.findByPairKey(
      this.buildPairKey(authUserId, input.userId),
    );
    if (!friendship || friendship.status !== 'ACCEPTED') {
      throw new NotFriendError('You can only invite a friend to a conversation');
    }

    const isAlreadyMember = conversation.members.some((m) => m.userId === input.userId);
    if (isAlreadyMember) {
      throw new MemberAlreadyExistsError();
    }

    const joinedAt = new Date();
    const updatedConversation = await this.conversationRepository.addGroupMember(
      conversationId,
      conversation.version,
      {
        userId: input.userId,
        role: 'MEMBER',
        joinedAt,
      },
    );

    if (!updatedConversation) {
      return this.throwMutationFailure(conversationId, {
        actorId: authUserId,
        allowedActorRoles: ['OWNER', 'ADMIN'],
        targetMemberId: input.userId,
        targetMustNotExist: true,
      });
    }

    const addedMember = updatedConversation.members.find((m) => m.userId === input.userId);

    return InviteMemberDto.toDomainMemberInvited(updatedConversation._id.toString(), {
      userId: input.userId,
      name: targetUser.name,
      imageUrl: targetUser.imageUrl ?? null,
      role: addedMember?.role ?? 'MEMBER',
      joinedAt: addedMember?.joinedAt ?? joinedAt,
      lastReadMessageId: addedMember?.lastReadMessageId ?? null,
      lastReadAt: addedMember?.lastReadAt ?? null,
    });
  }

  async leaveConversation(
    authUser: UserDocument,
    conversationId: string,
  ): Promise<RemoveMemberDto> {
    const authUserId = authUser._id.toString();
    const { conversation, member } = await this.validateConversationAccess(
      conversationId,
      authUserId,
      {
        requireGroupType: true,
      },
    );

    if (member.role === 'OWNER') {
      throw new CannotLeaveAsOwnerError();
    }

    const updatedConversation = await this.conversationRepository.removeGroupMember(
      conversationId,
      conversation.version,
      authUserId,
    );
    if (!updatedConversation) {
      return this.throwMutationFailure(conversationId, {
        actorId: authUserId,
        targetMemberId: authUserId,
        targetMustExist: true,
        targetMustNotBeOwner: true,
      });
    }

    return RemoveMemberDto.toDomainMemberRemoved(
      updatedConversation._id.toString(),
      {
        userId: authUserId,
        name: authUser.name,
        imageUrl: authUser.imageUrl ?? null,
        role: member.role,
      },
      new Date(updatedConversation.updatedAt),
    );
  }

  async kickMember(
    authUserId: string,
    conversationId: string,
    memberId: string,
  ): Promise<RemoveMemberDto> {
    const { conversation, member: authMember } = await this.validateConversationAccess(
      conversationId,
      authUserId,
      {
        requireGroupType: true,
        allowedRoles: ['OWNER', 'ADMIN'],
      },
    );

    if (memberId === authUserId) {
      throw new CannotKickSelfError();
    }

    const targetUser = await this.userRepository.findById(memberId);
    if (!targetUser) {
      throw new UserNotExistError('Target user does not exist');
    }
    if (targetUser.status !== 'ACTIVE') {
      throw new UserNotActiveError('Target user is not active');
    }

    const targetMember = conversation.members.find((m) => m.userId === memberId);
    if (!targetMember) {
      throw new MemberNotFoundError();
    }

    if (ROLE_HIERARCHY[authMember.role] <= ROLE_HIERARCHY[targetMember.role]) {
      throw new CannotKickHigherOrEqualRoleError();
    }

    const updatedConversation = await this.conversationRepository.removeGroupMember(
      conversationId,
      conversation.version,
      memberId,
    );
    if (!updatedConversation) {
      return this.throwMutationFailure(conversationId, {
        actorId: authUserId,
        allowedActorRoles: ['OWNER', 'ADMIN'],
        targetMemberId: memberId,
        targetMustExist: true,
        targetMustNotBeOwner: true,
        targetMustHaveLowerRoleThanActor: true,
      });
    }

    return RemoveMemberDto.toDomainMemberRemoved(
      updatedConversation._id.toString(),
      {
        userId: memberId,
        name: targetUser.name,
        imageUrl: targetUser.imageUrl ?? null,
        role: targetMember.role,
      },
      new Date(updatedConversation.updatedAt),
    );
  }

  /**
   * Reusable conversation validation helper:
   * - Checks conversation exists -> ConversationNotFoundError
   * - Checks conversation is not soft-deleted -> ConversationDeletedError
   * - Checks conversation is GROUP type when requireGroupType is true (default) -> DirectConversationActionNotAllowedError
   * - Checks user is a member -> NotConversationMemberError
   * - Optionally checks user's role -> InsufficientConversationRoleError
   */
  private async validateConversationAccess(
    conversationId: string,
    userId: string,
    options: ValidateConversationOptions = {},
  ): Promise<ValidatedConversationContext> {
    const { requireGroupType = true, allowedRoles } = options;

    const conversation = await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError();
    }

    if (conversation.deletedAt != null) {
      throw new ConversationDeletedError();
    }

    if (requireGroupType && conversation.type !== 'GROUP') {
      throw new DirectConversationActionNotAllowedError();
    }

    const member = conversation.members.find((m) => m.userId === userId);
    if (!member) {
      throw new NotConversationMemberError();
    }

    if (allowedRoles && !allowedRoles.includes(member.role)) {
      throw new InsufficientConversationRoleError();
    }

    return { conversation, member };
  }

  private buildPairKey(userA: string, userB: string): string {
    return [userA, userB].sort().join(':');
  }

  private async throwMutationFailure(
    conversationId: string,
    options: MutationFailureOptions = {},
  ): Promise<never> {
    const latest = await this.conversationRepository.findById(conversationId);

    if (!latest) {
      throw new ConversationNotFoundError();
    }

    if (latest.deletedAt != null) {
      throw new ConversationDeletedError();
    }

    if (latest.type !== 'GROUP') {
      throw new DirectConversationActionNotAllowedError();
    }

    // Check actor membership and role
    let actorMember: ChatGroupMembersDocument | undefined;

    if (options.actorId) {
      actorMember = latest.members.find((member) => member.userId === options.actorId);

      if (!actorMember) {
        throw new NotConversationMemberError();
      }

      if (options.allowedActorRoles && !options.allowedActorRoles.includes(actorMember.role)) {
        throw new InsufficientConversationRoleError();
      }
    }

    // Check target membership
    let targetMember: ChatGroupMembersDocument | undefined;

    if (options.targetMemberId) {
      targetMember = latest.members.find((member) => member.userId === options.targetMemberId);

      if (options.targetMustExist && !targetMember) {
        throw new MemberNotFoundError();
      }

      if (options.targetMustNotExist && targetMember) {
        throw new MemberAlreadyExistsError();
      }

      if (options.targetMustNotBeOwner && targetMember?.role === 'OWNER') {
        throw new CannotChangeOwnerRoleError();
      }

      if (
        targetMember &&
        options.targetRoleMustDifferFrom &&
        targetMember.role === options.targetRoleMustDifferFrom
      ) {
        throw new RoleUnchangedError();
      }
    }

    if (
      targetMember &&
      options.targetMustHaveLowerRoleThanActor &&
      actorMember &&
      ROLE_HIERARCHY[actorMember.role] <= ROLE_HIERARCHY[targetMember.role]
    ) {
      throw new CannotKickHigherOrEqualRoleError();
    }

    // No identifiable business rule failure
    throw new ConversationConflictError();
  }
}
