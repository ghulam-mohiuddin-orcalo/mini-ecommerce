import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** A new shipping/billing address for the authenticated user. */
export class CreateAddressDto {
  @ApiProperty({ example: 'Home', description: 'Short label for the address (e.g. "Home", "Work")' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label!: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Recipient full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '221B Baker Street' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  line1!: string;

  @ApiPropertyOptional({ example: 'Flat 2', description: 'Optional second address line' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ example: 'London' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'NW1 6XE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postcode!: string;

  @ApiProperty({ example: 'United Kingdom' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Make this the default address (unsets any other default). The first address is always default.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
