import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiForbiddenResponse, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { UserResponseDto } from './user.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Admin-only: list all users (sanitized). Exercises RolesGuard. */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Caller is not an admin' })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAllSafe();
  }
}
