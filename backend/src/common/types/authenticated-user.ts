import { Role } from '@prisma/client';

/** The shape attached to `req.user` after JWT validation. Never contains secrets. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
