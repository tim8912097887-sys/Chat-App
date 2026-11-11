import type { PublicUser } from "../features/user/types/index.js";
import {
  FRIEND_OFFLINE_EVENT,
  FRIEND_ONLINE_EVENT,
  FRIEND_REQUEST_ACCEPTED_EVENT,
  FRIEND_REQUEST_CREATED_EVENT,
  FRIEND_REQUEST_REJECTED_EVENT,
} from "./constants.js";

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
