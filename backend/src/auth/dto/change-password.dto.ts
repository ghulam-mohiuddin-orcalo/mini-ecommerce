import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Change password for a signed-in user. The new-password rules mirror signup. */
export class ChangePasswordDto {
  @ApiProperty({ example: 'currentP@ssw0rd' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ example: 'newSecret123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
