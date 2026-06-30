import { ApiProperty } from '@nestjs/swagger';
import { Address } from '@prisma/client';

/** Public shape of an address row returned to its owner. */
export class AddressResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Home' }) label!: string;
  @ApiProperty({ example: 'Jane Doe' }) fullName!: string;
  @ApiProperty({ example: '221B Baker Street' }) line1!: string;
  @ApiProperty({ nullable: true, example: 'Flat 2' }) line2!: string | null;
  @ApiProperty({ example: 'London' }) city!: string;
  @ApiProperty({ example: 'NW1 6XE' }) postcode!: string;
  @ApiProperty({ example: 'United Kingdom' }) country!: string;
  @ApiProperty({ description: 'Exactly one address per user is the default' }) isDefault!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

/** Map a Prisma Address row to the response DTO (no userId leaked to the client). */
export function toAddressResponse(address: Address): AddressResponseDto {
  return {
    id: address.id,
    label: address.label,
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    postcode: address.postcode,
    country: address.country,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}
