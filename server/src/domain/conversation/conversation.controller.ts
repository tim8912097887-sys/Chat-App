import type { RequestHandler } from 'express';
import { ConversationService } from './conversation.service.js';
import { CreateConversationBody } from './dto/create-conversation.js';
import { GetConversationsQuery } from './dto/get-conversations.js';
import { UpdateConversationBody } from './dto/update-conversation.js';
import { getAuthUser, sendResponse } from '../shared/controller.js';
import { ConversationMemberParams, ConversationParams } from './dto/common.js';
import { UpdateConversationMemberRoleBody } from './dto/update-member-role.js';
import { AddConversationMemberBody } from './dto/invite-member.js';

export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  createConversation: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const input = req.validatedBody as CreateConversationBody;
    const conversation = await this.conversationService.createConversation(
      authUser._id.toString(),
      input,
    );
    sendResponse(res, 201, conversation);
  };

  getConversations: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const pagination = req.validatedQuery as GetConversationsQuery;
    const conversations = await this.conversationService.getConversations(
      authUser._id.toString(),
      pagination,
    );
    sendResponse(res, 200, conversations);
  };

  getConversationDetails: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId } = req.validatedParams as ConversationParams;

    const conversation = await this.conversationService.getConversationDetails(
      authUser._id.toString(),
      conversationId,
    );
    sendResponse(res, 200, conversation);
  };

  updateConversation: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId } = req.validatedParams as ConversationParams;
    const changes = req.validatedBody as UpdateConversationBody;

    const updated = await this.conversationService.updateConversation(
      authUser._id.toString(),
      conversationId,
      changes,
    );
    sendResponse(res, 200, updated);
  };

  deleteConversation: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId } = req.validatedParams as ConversationParams;

    const deleted = await this.conversationService.deleteConversation(
      authUser._id.toString(),
      conversationId,
    );
    sendResponse(res, 200, deleted);
  };

  updateMemberRole: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId, memberId } = req.validatedParams as ConversationMemberParams;
    const input = req.validatedBody as UpdateConversationMemberRoleBody;

    const updated = await this.conversationService.updateMemberRole(
      authUser._id.toString(),
      conversationId,
      memberId,
      input,
    );
    sendResponse(res, 200, updated);
  };

  inviteMember: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId } = req.validatedParams as ConversationParams;
    const input = req.validatedBody as AddConversationMemberBody;

    const invited = await this.conversationService.inviteMember(
      authUser._id.toString(),
      conversationId,
      input,
    );
    sendResponse(res, 201, invited);
  };

  leaveConversation: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId } = req.validatedParams as ConversationParams;

    const removed = await this.conversationService.leaveConversation(authUser, conversationId);
    sendResponse(res, 200, removed);
  };

  kickMember: RequestHandler = async (req, res) => {
    const authUser = getAuthUser(req);
    const { conversationId, memberId } = req.validatedParams as ConversationMemberParams;

    const removed = await this.conversationService.kickMember(
      authUser._id.toString(),
      conversationId,
      memberId,
    );
    sendResponse(res, 200, removed);
  };
}
