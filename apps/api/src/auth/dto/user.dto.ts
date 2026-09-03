import { Profile, UserWithProfile } from '@repo/types';

export class UserDto implements UserWithProfile {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  profile: Profile;
}
