import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import {
  paginate,
  type AuthenticatedUser,
  type Paginated,
} from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { orderByField, searchAcross } from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import type { NoteSubjectType } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  NoteSubjectsService,
  subjectDefinition,
  type SubjectRef,
} from './notes.subjects.js';
import { mergeTimeline } from './notes.timeline.js';
import type {
  CreateNoteInput,
  QueryNotesInput,
  QueryTimelineInput,
  UpdateNoteInput,
} from './dto/note.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/** Explicit select, never a bare row spread. */
const NOTE_SELECT = {
  id: true,
  subjectType: true,
  subjectId: true,
  body: true,
  visibility: true,
  createdAt: true,
  createdById: true,
  createdBy: ACTOR_SELECT,
  updatedAt: true,
  updatedById: true,
  updatedBy: ACTOR_SELECT,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.NoteSelect;

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly subjects: NoteSubjectsService,
  ) {}

  /**
   * Every entry point starts here.
   *
   * The subject's own module decides whether this caller may see the record,
   * so a note is exactly as reachable as the client it is about — the rule is
   * applied once, where it already lives, rather than copied into this module
   * where it would drift. 404 when the caller may not see it, never 403.
   */
  private async subject(
    user: AuthenticatedUser,
    type: NoteSubjectType,
    id: string,
  ) {
    if (!this.subjects.mayRead(user, type)) {
      // A capability failure, not a row failure: this role cannot read
      // timelines of this kind at all, and saying so confirms nothing about
      // which records exist.
      throw new ForbiddenException(
        `Your role cannot read ${subjectDefinition(type).noun} notes`,
      );
    }
    return this.subjects.resolve(user, type, id);
  }

  private assertMayWrite(user: AuthenticatedUser, type: NoteSubjectType): void {
    if (!this.subjects.mayWrite(user, type)) {
      throw new ForbiddenException(
        `Your role cannot add notes to a ${subjectDefinition(type).noun}`,
      );
    }
  }

  /**
   * Authoring on an archived record is refused; reading it is not.
   *
   * The same split `findOne` and `findLive` make everywhere else. An archived
   * client's timeline must still open — the Archived tab links to it, and the
   * entries explaining *why* it was archived are the ones somebody has come to
   * read. But adding new commentary to a record the desk has closed, or
   * editing what a closed record says, writes history onto something nobody is
   * working; it would also be invisible, since the record is off every live
   * list.
   *
   * Withdrawing and restoring a note are deliberately still allowed: those are
   * moderation on an existing entry rather than a new statement, and taking
   * something off a closed record is exactly when it is most needed.
   *
   * 400 and not 404, because the caller can already see this subject — they
   * just read its timeline. Hiding it here would contradict the read.
   */
  private assertSubjectLive(subject: SubjectRef, type: NoteSubjectType): void {
    if (!subject.archived) return;
    const noun = subjectDefinition(type).noun;
    throw new BadRequestException(
      `That ${noun} has been archived. Restore it before writing on its timeline.`,
    );
  }

  /**
   * The notes on one record — the plain list, and the Archived tab.
   *
   * Not merged with the audit trail: this half is what people wrote, and it is
   * the half that can be edited, withdrawn and restored. `timeline()` below is
   * the reading view.
   */
  async findAll(
    user: AuthenticatedUser,
    query: QueryNotesInput,
  ): Promise<Paginated<unknown>> {
    await this.subject(user, query.subjectType, query.subjectId);
    const { skip, take } = toPrismaPagination(query);

    const where: Prisma.NoteWhereInput = {
      subjectType: query.subjectType,
      subjectId: query.subjectId,
      ...archiveFilter(query.archived),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...searchAcross(query.search, ['body']),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.note.findMany({
        where,
        select: NOTE_SELECT,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.note.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /**
   * The client's "timeline": what people wrote and what the system recorded,
   * in one order.
   *
   * A timeline of hand-written notes alone would be half a timeline — status
   * changes, reassignments and archives are already in `audit_logs`, and they
   * are the entries nobody has to remember to type. So the two are read
   * together and interleaved.
   *
   * **Paginated across two tables without a UNION.** Taking `skip + take` rows
   * from each and merging is exact, not an approximation: the nth newest row
   * overall cannot be later than the nth newest row of either source, so the
   * window is always fully covered. It over-fetches on deep pages, which a
   * timeline does not have — and a raw UNION would put a hand-written query
   * where the row-level rule lives, which is the one place this project keeps
   * readable.
   */
  async timeline(
    user: AuthenticatedUser,
    query: QueryTimelineInput,
  ): Promise<Paginated<unknown>> {
    const subject = await this.subject(
      user,
      query.subjectType,
      query.subjectId,
    );
    const { skip, take } = toPrismaPagination(query);
    const need = skip + take;

    const wantNotes = query.entries !== 'EVENT';
    const wantEvents = query.entries !== 'NOTE';

    const noteWhere: Prisma.NoteWhereInput = {
      subjectType: query.subjectType,
      subjectId: subject.id,
      // Live only. An archived note is one somebody withdrew; replaying it
      // beside the events it was withdrawn from would say the opposite of what
      // withdrawing it meant.
      deletedAt: null,
    };
    const eventWhere: Prisma.AuditLogWhereInput = {
      entityType: subjectDefinition(query.subjectType).entityType,
      entityId: subject.id,
    };

    // `Promise.all` rather than `$transaction`: both reads are read-only, and
    // a filter that asks for one source must not send a placeholder query to
    // the other — `where: { id: '' }` against a uuid column is a database
    // error, not an empty result.
    const [notes, noteTotal] = wantNotes
      ? await Promise.all([
          this.prisma.note.findMany({
            where: noteWhere,
            select: NOTE_SELECT,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: need,
          }),
          this.prisma.note.count({ where: noteWhere }),
        ])
      : [[], 0];

    const [events, eventTotal] = wantEvents
      ? await Promise.all([
          this.prisma.auditLog.findMany({
            where: eventWhere,
            select: {
              id: true,
              action: true,
              metadata: true,
              createdAt: true,
              actorId: true,
              actor: ACTOR_SELECT,
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: need,
          }),
          this.prisma.auditLog.count({ where: eventWhere }),
        ])
      : [[], 0];

    const merged = mergeTimeline(
      notes.map((note) => ({ kind: 'NOTE' as const, ...note })),
      events.map((event) => ({ kind: 'EVENT' as const, ...event })),
      skip,
      take,
    );

    return paginate(
      merged,
      noteTotal + eventTotal,
      query.page,
      query.limit,
    );
  }

  /**
   * One note, archived rows included — the same rule the detail endpoints
   * follow, so a withdrawn note can still be read and restored.
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const { note } = await this.load(user, id);
    return note;
  }

  /**
   * One note together with the subject it hangs on.
   *
   * Resolving the subject is what enforces the row-level rule — the note's own
   * id says nothing about who may read it, and the record it hangs on says
   * everything — so every caller needs both. Returning the pair means the
   * subject is fetched once per request rather than once per check.
   */
  private async load(user: AuthenticatedUser, id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      select: NOTE_SELECT,
    });
    if (!note) throw new NotFoundException('Note not found');

    // 404s for a caller outside the subject's scope.
    const subject = await this.subject(user, note.subjectType, note.subjectId);
    return { note, subject };
  }

  async create(user: AuthenticatedUser, dto: CreateNoteInput) {
    const subject = await this.subject(user, dto.subjectType, dto.subjectId);
    this.assertMayWrite(user, dto.subjectType);
    this.assertSubjectLive(subject, dto.subjectType);

    const note = await this.prisma.note.create({
      data: {
        subjectType: dto.subjectType,
        subjectId: subject.id,
        body: dto.body,
        visibility: dto.visibility,
        createdById: user.id,
        updatedById: user.id,
      },
      select: NOTE_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'note.created',
      entityType: 'Note',
      entityId: note.id,
      metadata: {
        subjectType: note.subjectType,
        subjectId: note.subjectId,
        subject: subject.label,
        visibility: note.visibility,
      },
    });

    return note;
  }

  /**
   * Only the author edits a note.
   *
   * Deliberately narrower than every other update in this system, including
   * for administrators. A note is a signed statement by a person — the
   * timeline renders it under their name — and an edit anyone else can make is
   * a statement they did not write attributed to them. An administrator who
   * disagrees withdraws it and writes their own, which leaves both visible.
   *
   * 403 and not 404 here, because the caller can already see the note: the
   * information a 404 would protect has been given by the read.
   */
  async update(user: AuthenticatedUser, id: string, dto: UpdateNoteInput) {
    const { note: target, subject } = await this.load(user, id);
    this.assertSubjectLive(subject, target.subjectType);
    if (target.deletedAt) {
      throw new ForbiddenException(
        'That note has been withdrawn. Restore it before editing.',
      );
    }
    if (target.createdById !== user.id) {
      throw new ForbiddenException('Only the author can edit a note');
    }

    const note = await this.prisma.note.update({
      where: { id },
      data: { ...dto, updatedById: user.id },
      select: NOTE_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'note.updated',
      entityType: 'Note',
      entityId: id,
      metadata: {
        subjectType: note.subjectType,
        subjectId: note.subjectId,
        fields: Object.keys(dto),
        ...(dto.visibility && dto.visibility !== target.visibility
          ? { visibility: { from: target.visibility, to: dto.visibility } }
          : {}),
      },
    });

    return note;
  }

  /**
   * Withdrawing a note is the author's call, or an administrator's.
   *
   * Wider than editing on purpose: removing a note that should not be on the
   * record is a moderation act and does not put words in anyone's mouth, while
   * the note itself stays readable in the Archived tab with the trail of who
   * withdrew it.
   */
  private assertMayArchive(
    user: AuthenticatedUser,
    note: { subjectType: NoteSubjectType; createdById: string | null },
  ): void {
    if (note.createdById === user.id) return;
    if (this.subjects.administers(user, note.subjectType)) return;
    throw new ForbiddenException(
      'Only the author or an administrator can withdraw a note',
    );
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const target = await this.findOne(user, id);
    this.assertMayArchive(user, target);

    await this.prisma.note.update({
      where: { id },
      data: { ...archiveData(user.id), updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'note.removed',
      entityType: 'Note',
      entityId: id,
      metadata: {
        subjectType: target.subjectType,
        subjectId: target.subjectId,
      },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const target = await this.findOne(user, id);
    this.assertMayArchive(user, target);
    if (!target.deletedAt) {
      throw new NotFoundException('That note is not archived');
    }

    const note = await this.prisma.note.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: NOTE_SELECT,
    });

    await this.audit.record({
      actorId: user.id,
      action: 'note.restored',
      entityType: 'Note',
      entityId: id,
      metadata: {
        subjectType: note.subjectType,
        subjectId: note.subjectId,
      },
    });

    return note;
  }
}
