import type { RequestHandler } from 'express';
import type { FriendRequestQuery } from './dto/get-friend-requests.js';
import type { CreateFriendRequestBody } from './dto/create-friend-request.js';
import type { UpdateFriendRequestBody } from './dto/update-friend-request.js';
import type { RelationshipService } from './relationship.service.js';
import { getAuthUser, sendResponse } from '../shared/controller.js';

export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  getFriendRequests: RequestHandler = async (req, res) => {
    const validatedUser = getAuthUser(req);
    const { direction, page, limit } = req.validatedQuery as FriendRequestQuery;
    const requests = await this.relationshipService.getFriendRequests(
      { userId: validatedUser._id.toString() },
      { direction, page, limit },
    );
    sendResponse(res, 200, requests);
  };

  createFriendRequest: RequestHandler = async (req, res) => {
    const validatedUser = getAuthUser(req);
    const { targetUserId } = req.validatedBody as CreateFriendRequestBody;
    await this.relationshipService.createFriendRequest(validatedUser, { targetUserId });
    sendResponse(res, 201, { message: 'Friend request sent' });
  };

  acceptFriendRequest: RequestHandler = async (req, res) => {
    const validatedUser = getAuthUser(req);
    const { requesterId } = req.validatedBody as UpdateFriendRequestBody;
    await this.relationshipService.acceptFriendRequest(validatedUser, requesterId);
    sendResponse(res, 200, { message: 'Friend request accepted' });
  };

  rejectFriendRequest: RequestHandler = async (req, res) => {
    const validatedUser = getAuthUser(req);
    const { requesterId } = req.validatedBody as UpdateFriendRequestBody;
    await this.relationshipService.rejectFriendRequest(validatedUser, requesterId);
    sendResponse(res, 200, { message: 'Friend request rejected' });
  };
}
