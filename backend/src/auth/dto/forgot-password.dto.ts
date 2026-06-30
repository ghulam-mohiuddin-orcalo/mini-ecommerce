import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@shop.test', maxLength: 255 })
  @NormalizeEmail()
  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(255)
  email!: string;
}
