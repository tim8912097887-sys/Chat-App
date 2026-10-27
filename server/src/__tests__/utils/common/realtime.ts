import { expect } from 'vitest';
import { RealtimeEvent } from '../../../realtime/realtime.types.js';

export const realtimeEventAssertion = (type: RealtimeEvent['type'], data: any) => {
  return {
    eventId: expect.any(String),
    type,
    occurredAt: expect.any(String),
    data,
  };
};
