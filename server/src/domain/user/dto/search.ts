import { z } from 'zod';
import { PublicUser } from '../user.types.js';
import { RelationshipState } from '../../relationship/relationship.constants.js';

export const searchCodeQuerySchema = z.object({
  q: z
    .string('q must be a string')
    .trim()
    .length(8, 'q must be 8 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'q must contain only letters and numbers'),
});

export type SearchCodeQuery = z.infer<typeof searchCodeQuerySchema>;

export interface SearchUserResponseDto {
  user: PublicUser;
  state: RelationshipState;
}
