import { api } from '../common/app.js';
import {
  conversationDetailsUrl,
  conversationMembersUrl,
  conversationMemberUrl,
  CONVERSATIONS_URL,
  leaveConversationUrl,
} from './constants.js';

export interface AuthRequestOptions {
  token?: string;
  authorizationHeader?: string;
}

function applyAuth(req: ReturnType<ReturnType<typeof api>['get']>, auth?: AuthRequestOptions) {
  if (auth?.authorizationHeader !== undefined) {
    return req.set('Authorization', auth.authorizationHeader);
  }
  if (auth?.token !== undefined) {
    return req.set('Authorization', `Bearer ${auth.token}`);
  }
  return req;
}

export async function createConversationRequest(
  body: Record<string, unknown>,
  auth?: AuthRequestOptions,
) {
  const req = api().post(CONVERSATIONS_URL).send(body);
  return applyAuth(req, auth);
}

export async function getConversationsRequest(
  query: Record<string, unknown> = {},
  auth?: AuthRequestOptions,
) {
  const req = api().get(CONVERSATIONS_URL).query(query);
  return applyAuth(req, auth);
}

export async function getConversationDetailsRequest(
  conversationId: string,
  auth?: AuthRequestOptions,
) {
  const req = api().get(conversationDetailsUrl(conversationId));
  return applyAuth(req, auth);
}

export async function updateConversationRequest(
  conversationId: string,
  body: Record<string, unknown>,
  auth?: AuthRequestOptions,
) {
  const req = api().patch(conversationDetailsUrl(conversationId)).send(body);
  return applyAuth(req, auth);
}

export async function deleteConversationRequest(conversationId: string, auth?: AuthRequestOptions) {
  const req = api().delete(conversationDetailsUrl(conversationId));
  return applyAuth(req, auth);
}

export async function updateMemberRoleRequest(
  conversationId: string,
  memberId: string,
  body: Record<string, unknown>,
  auth?: AuthRequestOptions,
) {
  const req = api().patch(conversationMemberUrl(conversationId, memberId)).send(body);
  return applyAuth(req, auth);
}

export async function inviteMemberRequest(
  conversationId: string,
  body: Record<string, unknown>,
  auth?: AuthRequestOptions,
) {
  const req = api().post(conversationMembersUrl(conversationId)).send(body);
  return applyAuth(req, auth);
}

export async function leaveConversationRequest(conversationId: string, auth?: AuthRequestOptions) {
  const req = api().delete(leaveConversationUrl(conversationId));
  return applyAuth(req, auth);
}

export async function kickMemberRequest(
  conversationId: string,
  memberId: string,
  auth?: AuthRequestOptions,
) {
  const req = api().delete(conversationMemberUrl(conversationId, memberId));
  return applyAuth(req, auth);
}
