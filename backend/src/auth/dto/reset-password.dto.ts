import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...', description: 'Raw reset token from the email link' })
  @IsString()
  @MaxLength(512)
  token!: string;

  // Same password rules as signup: bcrypt only considers the first 72 bytes, so longer values are
  // rejected to avoid silent truncation, and a minimum length is enforced for basic strength.
  @ApiProperty({ example: 'Sup3rSecret!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  password!: string;
}
