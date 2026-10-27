import { PublicUser } from '../domain/user/user.types.js';
import {
  FRIEND_OFFLINE_EVENT,
  FRIEND_ONLINE_EVENT,
  FRIEND_REQUEST_ACCEPTED_EVENT,
  FRIEND_REQUEST_CREATED_EVENT,
  FRIEND_REQUEST_REJECTED_EVENT,
} from './realtime.constants.js';
import type { DefaultEventsMap, Socket } from 'socket.io';

type EventEnvelope<TType extends string, TData> = {
  eventId: string;
  type: TType;
  occurredAt: string;
  data: TData;
};

export type RealtimeEvent =
  | EventEnvelope<
      typeof FRIEND_ONLINE_EVENT,
      {
        userId: string;
      }
    >
  | EventEnvelope<
      typeof FRIEND_OFFLINE_EVENT,
      {
        userId: string;
      }
    >
  | EventEnvelope<
      typeof FRIEND_REQUEST_CREATED_EVENT,
      {
        requestId: string;
        requester: PublicUser;
      }
    >
  | EventEnvelope<
      typeof FRIEND_REQUEST_ACCEPTED_EVENT,
      {
        requestId: string;
        actor: PublicUser;
      }
    >
  | EventEnvelope<
      typeof FRIEND_REQUEST_REJECTED_EVENT,
      {
        requestId: string;
        actor: PublicUser;
      }
    >;

export const createRealtimeEvent = <TType extends RealtimeEvent['type']>(
  type: TType,
  data: Extract<RealtimeEvent, { type: TType }>['data'],
): Extract<RealtimeEvent, { type: TType }> =>
  ({
    eventId: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    data,
  }) as Extract<RealtimeEvent, { type: TType }>;

export interface AuthenticatedSocketData {
  user: {
    userId: string;
    tokenVersion: number;
  };
}

export type AuthenticatedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  AuthenticatedSocketData
>;
