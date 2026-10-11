import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { Action, Module } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { UsersService } from './users.service.js';

/**
 * Each role's defaults, locks and reach, module by module — the rules the
 * invite and edit forms start from and the Roles & Permissions tab shows.
 * Generated from `access.roles.ts`, never a frontend copy.
 */
@ApiTags('Users')
@Controller('roles')
export class RolesController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequireAccess(Module.USERS, Action.VIEW)
  @ApiOperation({
    summary: 'Roles and their default permissions',
    description:
      'Every role with its headcount, description and, per module, its reach and each action as default, optional or locked.',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.users.rolesOverview(user);
  }

  @Get(':role/defaults')
  @RequireAccess(Module.USERS, Action.VIEW)
  @ApiOperation({
    summary: "One role's default permissions",
    description:
      'What the invite and edit forms load when a role is picked: per module, the reach, the modules it requires, and each action as default or locked.',
  })
  defaults(@Param('role', new ParseEnumPipe(UserRole)) role: UserRole) {
    return this.users.roleDefaults(role);
  }
}
