import {
  ApiError,
  BadRequestError,
  ServerConflictError,
  UnauthenticationError,
  ForbiddenError,
  NotFoundError,
} from '../../../app/api.js';
import {
  InvalidCredentialError,
  InvalidImageError,
  InvalidTokenError,
  LoginLockedError,
} from '../../../domain/auth/error/auth.js';
import { DomainError } from '../../../domain/shared/error.js';
import {
  FriendshipAlreadyExistError,
  InvalidFriendshipChangeError,
  SendFriendRequestToSelfError,
  NotFriendError,
} from '../../../domain/relationship/error/relationship.js';
import {
  InvalidUserTokenError,
  UserNotActiveError,
  UserNotExistError,
} from '../../../domain/user/error/user.js';
import {
  CannotCreateDirectConversationWithSelfError,
  ConversationDeletedError,
  ConversationNotFoundError,
  DirectConversationActionNotAllowedError,
} from '../../../domain/conversation/error/conversation.js';
import {
  CannotInviteSelfError,
  CannotKickSelfError,
  CannotLeaveAsOwnerError,
  MemberAlreadyExistsError,
  MemberNotFoundError,
  NotConversationMemberError,
} from '../../../domain/conversation/error/membership.js';
import {
  CannotChangeOwnerRoleError,
  CannotKickHigherOrEqualRoleError,
  InsufficientConversationRoleError,
  RoleUnchangedError,
} from '../../../domain/conversation/error/permission.js';

export const mapDomainErrorToApiError = (error: DomainError): ApiError | undefined => {
  if (error instanceof InvalidTokenError) {
    return new UnauthenticationError(error.message);
  } else if (error instanceof InvalidUserTokenError) {
    return new UnauthenticationError(error.message);
  } else if (error instanceof InvalidCredentialError) {
    return new BadRequestError(error.message);
  } else if (error instanceof LoginLockedError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof InvalidImageError) {
    return new BadRequestError(error.message);
  } else if (error instanceof FriendshipAlreadyExistError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof InvalidFriendshipChangeError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof SendFriendRequestToSelfError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof NotFriendError) {
    return new BadRequestError(error.message);
  } else if (error instanceof UserNotActiveError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof UserNotExistError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof CannotCreateDirectConversationWithSelfError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof ConversationNotFoundError) {
    return new NotFoundError(error.message);
  } else if (error instanceof ConversationDeletedError) {
    return new NotFoundError(error.message);
  } else if (error instanceof DirectConversationActionNotAllowedError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof NotConversationMemberError) {
    return new ForbiddenError(error.message);
  } else if (error instanceof InsufficientConversationRoleError) {
    return new ForbiddenError(error.message);
  } else if (error instanceof MemberNotFoundError) {
    return new NotFoundError(error.message);
  } else if (error instanceof CannotChangeOwnerRoleError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof RoleUnchangedError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof MemberAlreadyExistsError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof CannotInviteSelfError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof CannotKickSelfError) {
    return new ServerConflictError(error.message);
  } else if (error instanceof CannotKickHigherOrEqualRoleError) {
    return new ForbiddenError(error.message);
  } else if (error instanceof CannotLeaveAsOwnerError) {
    return new ServerConflictError(error.message);
  } else {
    return undefined;
  }
};
