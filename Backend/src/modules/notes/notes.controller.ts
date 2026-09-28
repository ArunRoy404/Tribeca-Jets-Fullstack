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
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { NotesService } from './notes.service.js';
import {
  CreateNoteDto,
  QueryNotesDto,
  QueryTimelineDto,
  UpdateNoteDto,
} from './dto/note.dto.js';

/**
 * Dated entries on a record's timeline (client adjustment #5).
 *
 * **No `@RequirePermissions` decorator, deliberately**, and this is the same
 * reasoning the uploads module records. A note carries no permission of its
 * own: the right to read or write one is the right to read or write the record
 * it hangs on, and which permission that is depends on `subjectType` — a value
 * in the query string, which a decorator evaluated before the request body
 * cannot see.
 *
 * So the capability check moves one layer in, to `NoteSubjectsService`, which
 * reads the same matrix `PermissionsGuard` reads, and the row-level check goes
 * to the module that owns the subject. A caller who may not see a client gets
 * 404 on its notes by the rule that already hides the client, rather than by a
 * second copy of it here.
 *
 * Authentication is still global — `JwtAuthGuard` — so nothing here is open.
 */
@ApiTags('Notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  /** Before `:id` — Nest matches in order and would read it as an id. */
  @Get('timeline')
  @ApiOperation({
    summary: "A record's timeline: what people wrote and what the system recorded",
    description:
      'Notes and audit entries about the same record, interleaved newest-first. A timeline of hand-written notes alone would be half a timeline, because status changes, reassignments and archives are already recorded and are the entries nobody has to remember to type. Archived notes are excluded — withdrawing one meant taking it off the record. Use `entries=NOTE` or `entries=EVENT` to read one half.',
  })
  timeline(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTimelineDto,
  ) {
    return this.notes.timeline(user, query);
  }

  @Get()
  @ApiOperation({
    summary: "List a record's notes",
    description:
      'The editable half on its own, without the audit entries. `subjectType` and `subjectId` are both required: a note is only meaningful beside the record it is about, and an unscoped list would be the one query that ignores the row-level rule the subject carries. `archived=true` is the Archived tab.',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotesDto,
  ) {
    return this.notes.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one note',
    description:
      'Archived notes load here too, so the Archived tab can link to them. A note on a record outside the caller\'s scope returns 404 rather than 403 — the note\'s own id says nothing about who may read it, and the record it hangs on says everything.',
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notes.findOne(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Write a note on a record',
    description:
      'Needs write access to the subject, so an assistant — who may read a client and not edit one — reads the timeline and cannot add to it. `visibility` defaults to INTERNAL; SHARED marks a note intended for the referral agent who introduced the client (adjustment #11), and is stored and displayed today rather than filtering anybody, because that role does not exist yet.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNoteDto) {
    return this.notes.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit your own note',
    description:
      'Only the author, including for administrators — deliberately narrower than every other update in this system. The timeline renders a note under the name of whoever wrote it, so an edit anyone else can make is a statement they did not write attributed to them. An administrator who disagrees withdraws it and writes their own, which leaves both visible. The subject cannot be changed: a note written about the wrong record is withdrawn and rewritten.',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(user, id, dto);
  }

  /** 200, not the 201 Nest gives a POST: a restore creates nothing. */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Put a withdrawn note back on the timeline',
    description:
      'The author or an administrator. Clears the deletion stamp and nothing else.',
  })
  restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notes.restore(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Withdraw a note (soft)',
    description:
      'The author or an administrator — wider than editing, because removing a note that should not be on the record is a moderation act and does not put words in anyone\'s mouth. The note stays readable in the Archived tab with the trail of who withdrew it; nothing in this system is destroyed.',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notes.remove(user, id);
  }
}
