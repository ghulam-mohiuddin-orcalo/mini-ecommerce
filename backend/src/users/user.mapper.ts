import { Role, User } from '@prisma/client';

/** Public-safe representation of a user — explicitly never includes passwordHash. */
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

/** Strip secrets from a User row before it ever leaves the server. */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}
