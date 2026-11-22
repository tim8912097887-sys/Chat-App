import type { RequestHandler, Response } from 'express';
import { successResponse } from '../../shared/http/success.js';
import type { UserService } from './user.service.js';
import type { FriendSearchQuery, SearchCodeQuery } from './dto/query-params.js';
import { UserProfile } from './user.types.js';
import { InvalidUserTokenError } from './error/invalid-user-token.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  profile: RequestHandler = (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const profile: UserProfile = {
      id: validatedUser._id.toString(),
      name: validatedUser.name,
      email: validatedUser.email,
      searchCode: validatedUser.searchCode,
      imageUrl: validatedUser.imageUrl ?? null,
    };
    this.sendResponse(res, profile);
  };

  search: RequestHandler = async (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const { q } = req.query as SearchCodeQuery;
    const user = await this.userService.searchActiveBySearchCode(
      { userId: validatedUser._id.toString() },
      q,
    );
    this.sendResponse(res, user);
  };

  searchFriends: RequestHandler = async (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const { q, page, limit } = req.query as unknown as FriendSearchQuery;
    const users = await this.userService.searchFriendsByName(
      { userId: validatedUser._id.toString() },
      { name: q, page, limit },
    );
    this.sendResponse(res, users);
  };

  private sendResponse<T>(res: Response, data: T): void {
    res.status(200).json(successResponse(data));
  }
}
