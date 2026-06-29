import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'new.customer@shop.test', maxLength: 255 })
  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Jordan Shopper', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Sup3rSecret!', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72) // bcrypt only considers the first 72 bytes; reject longer to avoid silent truncation
  password!: string;
}
