import type { RequestHandler, Response } from 'express';
import { successResponse } from '../../shared/http/success.js';
import type {
  CreateFriendRequestBody,
  FriendRequestQuery,
  UpdateFriendRequestBody,
} from './dto/friend-request.js';
import type { RelationshipService } from './relationship.service.js';
import { InvalidUserTokenError } from '../user/error/invalid-user-token.js';

export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  getFriendRequests: RequestHandler = async (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const { direction, page, limit } = req.query as unknown as FriendRequestQuery;
    const requests = await this.relationshipService.getFriendRequests(
      { userId: validatedUser._id.toString() },
      { direction, page, limit },
    );
    this.sendResponse(res, 200, requests);
  };

  createFriendRequest: RequestHandler = async (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const { targetUserId } = req.body as CreateFriendRequestBody;
    await this.relationshipService.createFriendRequest(validatedUser, { targetUserId });
    this.sendResponse(res, 201, { message: 'Friend request sent' });
  };

  acceptFriendRequest: RequestHandler = async (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const { requesterId } = req.body as UpdateFriendRequestBody;
    await this.relationshipService.acceptFriendRequest(validatedUser, requesterId);
    this.sendResponse(res, 200, { message: 'Friend request accepted' });
  };

  rejectFriendRequest: RequestHandler = async (req, res) => {
    const validatedUser = req.user;
    if (!validatedUser) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    const { requesterId } = req.body as UpdateFriendRequestBody;
    await this.relationshipService.rejectFriendRequest(validatedUser, requesterId);
    this.sendResponse(res, 200, { message: 'Friend request rejected' });
  };

  private sendResponse<T>(res: Response, status: number, data: T): void {
    res.status(status).json(successResponse(data));
  }
}
