import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'customer@shop.test' })
  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Customer123!' })
  @IsString()
  @MaxLength(72)
  password!: string;
}
