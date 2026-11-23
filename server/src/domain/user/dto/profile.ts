import { AuthenticatedUser } from '../user.types.js';

export interface UserProfileDto extends AuthenticatedUser {
  email: string;
}
