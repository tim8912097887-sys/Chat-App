import type { RealtimeEvent } from './realtime.types.ts';

export interface RealtimeEventPublisher {
  publishToUser(userId: string, event: RealtimeEvent): void;
  publishToUsers(userIds: string[], event: RealtimeEvent): void;
  isUserOnline(userId: string): Promise<boolean>;
}
