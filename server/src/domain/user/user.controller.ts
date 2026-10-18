import type { RequestHandler, Response } from 'express';
import { successResponse } from '../../shared/http/success.js';
import type { UserService } from './user.service.js';
import type { FriendSearchQuery, SearchCodeQuery } from './dto/query-params.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  search: RequestHandler = async (req, res) => {
    const { q } = req.body as SearchCodeQuery;
    const user = await this.userService.searchActiveBySearchCode(q);
    this.sendResponse(res, user);
  };

  searchFriends: RequestHandler = async (req, res) => {
    const { userId, tokenVersion } = req.accessToken!;
    const { q, offset, limit } = req.body as FriendSearchQuery;
    const users = await this.userService.searchFriendsByName(
      { userId, tokenVersion },
      { name: q, offset, limit },
    );
    this.sendResponse(res, users);
  };

  private sendResponse<T>(res: Response, data: T): void {
    res.status(200).json(successResponse(data));
  }
}
