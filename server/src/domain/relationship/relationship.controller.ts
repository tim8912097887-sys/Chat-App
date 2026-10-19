import type { RequestHandler, Response } from 'express';
import { successResponse } from '../../shared/http/success.js';
import type {
  CreateFriendRequestBody,
  FriendRequestPathParams,
  FriendRequestQuery,
} from './dto/friend-request.js';
import type { RelationshipService } from './relationship.service.js';

export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  getFriendRequests: RequestHandler = async (req, res) => {
    const { userId, tokenVersion } = req.accessToken!;
    const { direction, page, limit } = req.query as unknown as FriendRequestQuery;
    const requests = await this.relationshipService.getFriendRequests(
      { userId, tokenVersion },
      { direction, page, limit },
    );
    this.sendResponse(res, 200, requests);
  };

  createFriendRequest: RequestHandler = async (req, res) => {
    const { userId, tokenVersion } = req.accessToken!;
    const { targetUserId } = req.body as CreateFriendRequestBody;
    await this.relationshipService.createFriendRequest({ userId, tokenVersion }, { targetUserId });
    this.sendResponse(res, 201, { message: 'Friend request sent' });
  };

  acceptFriendRequest: RequestHandler = async (req, res) => {
    const { userId, tokenVersion } = req.accessToken!;
    const { requestId } = req.params as FriendRequestPathParams;
    await this.relationshipService.acceptFriendRequest({ userId, tokenVersion }, requestId);
    this.sendResponse(res, 200, { message: 'Friend request accepted' });
  };

  rejectFriendRequest: RequestHandler = async (req, res) => {
    const { userId, tokenVersion } = req.accessToken!;
    const { requestId } = req.params as FriendRequestPathParams;
    await this.relationshipService.rejectFriendRequest({ userId, tokenVersion }, requestId);
    this.sendResponse(res, 200, { message: 'Friend request rejected' });
  };

  private sendResponse<T>(res: Response, status: number, data: T): void {
    res.status(status).json(successResponse(data));
  }
}
