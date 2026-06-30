import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';

/** All fields optional — patch a subset of an existing address. */
export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
