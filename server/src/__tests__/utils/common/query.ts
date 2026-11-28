import { getRefreshTokenModel } from '../../../domain/auth/auth.model.js';
import { registerChatGroupsModel } from '../../../domain/conversation/chat-group.model.js';
import { registerFriendshipsModel } from '../../../domain/relationship/friendships.model.js';
import { registerUserModel } from '../../../domain/user/user.model.js';

export const authModel = getRefreshTokenModel();

export const userModel = registerUserModel();

export const friendshipModel = registerFriendshipsModel();

export const chatGroupModel = registerChatGroupsModel();

export async function truncateAll() {
  await Promise.all([
    authModel.deleteMany(),
    userModel.deleteMany(),
    friendshipModel.deleteMany(),
    chatGroupModel.deleteMany(),
  ]);
}
