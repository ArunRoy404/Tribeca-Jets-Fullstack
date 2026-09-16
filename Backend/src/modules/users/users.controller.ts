import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireWritePermissions } from '../../common/decorators/permissions.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UsersService } from './users.service.js';
import {
  InviteUserDto,
  QueryUsersDto,
  UpdateUserDto,
} from './dto/user.dto.js';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * Deliberately not gated behind MANAGE_USERS.
   *
   * Every module needs a staff picker — the client form's "Assigned Broker"
   * dropdown is the first — so any signed-in user may list colleagues. The
   * service narrows *what* is returned by role: without MANAGE_USERS the
   * response carries names and roles only, no status or login history.
   */
  @Get()
  @ApiOperation({
    summary: 'List team members',
    description:
      'Paginated, filterable staff directory. Callers without the Manage Users permission receive a reduced projection and only active accounts.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryUsersDto,
  ) {
    return this.users.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Team headcount tiles',
    description: 'Totals by status and role for the cards above the table.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.users.stats(user);
  }

  /**
   * Served to every signed-in user, not just administrators: the frontend uses
   * it to hide controls the caller cannot use. Hiding a button is a courtesy —
   * the guard on each route is the actual enforcement.
   */
  @Get('roles')
  @ApiOperation({
    summary: 'Roles and the permission matrix',
    description:
      'Generated from the server-side matrix, so the table an administrator reads is the ruleset the API enforces rather than a frontend copy that can drift.',
  })
  roles(@CurrentUser() user: AuthenticatedUser) {
    return this.users.rolesOverview(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one team member' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.users.findOne(user, id);
  }

  @Post('invite')
  @RequireWritePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary: 'Invite a team member',
    description:
      'Creates the account in INVITED status with no usable password. The invitee sets their own through the password-reset flow, so no credential is ever chosen by or transmitted to the inviter.',
  })
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteUserDto) {
    return this.users.invite(user, dto);
  }

  @Patch(':id')
  @RequireWritePermissions(Permission.MANAGE_USERS)
  @ApiOperation({
    summary: 'Update a team member',
    description:
      'Role, status, profile and the two-factor flag. Email is immutable. Refuses self-demotion and refuses to leave the system without an active administrator.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }
}
