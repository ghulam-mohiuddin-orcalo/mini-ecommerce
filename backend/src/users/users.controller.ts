import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { SafeUser } from './user.mapper';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Admin-only: list all users (sanitized). Exercises RolesGuard. */
  @Get()
  @Roles(Role.ADMIN)
  findAll(): Promise<SafeUser[]> {
    return this.usersService.findAllSafe();
  }
}
