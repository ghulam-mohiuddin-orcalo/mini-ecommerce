import { ApiProperty } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';

/** Public-safe representation of a user — explicitly never includes passwordHash. */
export class UserResponseDto {
  @ApiProperty({ example: 'cuid_abc123', description: 'Unique user id' })
  id!: string;

  @ApiProperty({ example: 'customer@shop.test' })
  email!: string;

  @ApiProperty({ example: 'Casey Customer' })
  name!: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  role!: Role;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

/** Strip secrets from a User row before it ever leaves the server. */
export function toSafeUser(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}
