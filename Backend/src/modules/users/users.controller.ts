import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { RequireAccess } from '../../common/decorators/access.decorator.js';
import { Permission } from '../../common/authorization/permissions.js';
import { Action, Module } from '../../common/authorization/access.js';
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
   *
   * VIEW_TEAM is what keeps a referral agent (#11) out: every desk role holds
   * it, the partner role does not. It stays on the old matrix while the
   * pickers' own modules are, and the per-user Users & Roles permission
   * decides only how much each row shows (see `projectFor`).
   */
  @Get()
  @RequirePermissions(Permission.VIEW_TEAM)
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
  @RequireAccess(Module.USERS, Action.VIEW)
  @ApiOperation({
    summary: 'Team headcount tiles',
    description: 'Totals by status and role for the cards above the table.',
  })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.users.stats(user);
  }

  @Get(':id')
  @RequireAccess(Module.USERS, Action.VIEW)
  @ApiOperation({ summary: 'Get one team member' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.users.findOne(user, id);
  }

  @Post('invite')
  @RequireAccess(Module.USERS, Action.CREATE)
  @ApiOperation({
    summary: 'Invite a team member',
    description:
      'Creates the account in INVITED status with the first password the inviter set, emailed with the invitation; the first sign-in activates it. `permissions` defaults to the role\'s; sending it needs Users & Roles · Change roles & permissions, and anything the role can never hold is refused.',
  })
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteUserDto) {
    return this.users.invite(user, dto);
  }

  @Patch(':id')
  @RequireAccess(Module.USERS, Action.EDIT)
  @ApiOperation({
    summary: 'Update a team member',
    description:
      'Role, status, permissions, profile and the two-factor flag. Email is immutable. Changing role or permissions needs Users & Roles · Change roles & permissions; a role change without `permissions` resets them to the new role\'s defaults. Refuses self-demotion, editing your own permissions, and leaving the system without an active administrator.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(user, id, dto);
  }

  @Delete(':id/invitation')
  @HttpCode(HttpStatus.OK)
  @RequireAccess(Module.USERS, Action.CREATE)
  @ApiOperation({
    summary: 'Withdraw a pending invitation',
    description:
      'Permanently deletes an account still INVITED — the one permanent delete in the system, allowed because the invitee never signed in and has no history. Frees the email address. 400 for an account that has signed in (suspend it instead); 409, naming them, while clients, trips, documents or anything else are attached. Audited as `user.invitation_withdrawn`. Needs Users & Roles · Invite users.',
  })
  withdrawInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.users.withdrawInvitation(user, id);
  }
}
