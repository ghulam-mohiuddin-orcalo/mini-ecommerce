import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';

@ApiTags('addresses')
@ApiCookieAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  // Every operation is scoped to the authenticated user's id from the JWT. The client never
  // supplies a userId; by-id routes are ownership-checked and 404 for another user's address.

  @Get()
  @ApiOperation({ summary: "List the current user's addresses (default first, then newest)" })
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponseDto[]> {
    return this.addressesService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an address (the first one, or isDefault, becomes the default)' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned address' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found or not owned by the user' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.addressesService.update(user.id, id, dto);
  }

  @Post(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make an owned address the default (unsets any other default)' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found or not owned by the user' })
  setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AddressResponseDto> {
    return this.addressesService.setDefault(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an owned address (promotes the newest remaining to default if needed)',
  })
  @ApiOkResponse({ type: AddressResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Address not found or not owned by the user' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AddressResponseDto[]> {
    return this.addressesService.remove(user.id, id);
  }
}
