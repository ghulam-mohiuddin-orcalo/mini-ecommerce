import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

/**
 * Public contact / newsletter payload. Both the storefront contact form and the footer
 * newsletter signup post here, so the surface is deliberately permissive — only `email` is
 * strictly shaped; the rest are short free text. Stored verbatim as a real ContactMessage.
 */
export class ContactMessageDto {
  @ApiProperty({ example: 'Jordan Shopper', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 'jordan@shop.test', maxLength: 255 })
  @NormalizeEmail()
  @IsEmail({}, { message: 'A valid email is required' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Question about my order', minLength: 1, maxLength: 150 })
  @IsString()
  @Length(1, 150)
  subject!: string;

  @ApiProperty({ example: 'Hi, I wanted to ask about...', minLength: 1, maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  body!: string;
}
