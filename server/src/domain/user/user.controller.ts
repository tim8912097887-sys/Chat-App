import type { RequestHandler } from 'express';
import type { UserService } from './user.service.js';
import type { SearchCodeQuery, SearchUserResponseDto } from './dto/search.js';
import type { FriendSearchQuery, SearchFriendResponseDto } from './dto/search-friends.js';
import type { UserProfileDto } from './dto/profile.js';
import { getAuthUser, sendResponse } from '../shared/controller.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  profile: RequestHandler = (req, res) => {
    const validatedUser = getAuthUser(req);
    const profile: UserProfileDto = {
      id: validatedUser._id.toString(),
      name: validatedUser.name,
      email: validatedUser.email,
      searchCode: validatedUser.searchCode,
      imageUrl: validatedUser.imageUrl ?? null,
    };
    sendResponse(res, 200, profile);
  };

  search: RequestHandler = async (req, res) => {
    const validatedUser = getAuthUser(req);
    const { q } = req.validatedQuery as SearchCodeQuery;
    const user: SearchUserResponseDto | null = await this.userService.searchActiveBySearchCode(
      { userId: validatedUser._id.toString() },
      q,
    );
    sendResponse(res, 200, user);
  };

  searchFriends: RequestHandler = async (req, res) => {
    const validatedUser = getAuthUser(req);
    const { q, page, limit } = req.validatedQuery as FriendSearchQuery;
    const users: SearchFriendResponseDto[] = await this.userService.searchFriendsByName(
      { userId: validatedUser._id.toString() },
      { name: q, page, limit },
    );
    sendResponse(res, 200, users);
  };
}
