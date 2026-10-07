import { describe, expect, it } from 'vitest';
import { UserRole, UploadVisibility } from '../../generated/prisma/enums.js';
import {
  administersUsers,
  mayManage,
  mayRead,
  visibilityWhere,
  type UploadAccessFacts,
} from './uploads.access.js';

const admin = { id: 'admin-1', role: UserRole.ADMIN };
const superAdmin = { id: 'super-1', role: UserRole.SUPER_ADMIN };
const mark = { id: 'mark-1', role: UserRole.BROKER };
const barry = { id: 'barry-1', role: UserRole.BROKER };
const assistant = { id: 'asst-1', role: UserRole.ASSISTANT };

/** A 1099 an administrator filed about Mark. The row this whole file exists for. */
const marksTaxForm: UploadAccessFacts = {
  visibility: UploadVisibility.PRIVATE,
  ownerUserId: mark.id,
  uploadedById: admin.id,
};

const brochure: UploadAccessFacts = {
  visibility: UploadVisibility.PUBLIC,
  ownerUserId: null,
  uploadedById: admin.id,
};

describe('who may read an upload', () => {
  it('lets anyone signed in read a public file', () => {
    for (const actor of [admin, mark, barry, assistant]) {
      expect(mayRead(actor, brochure), actor.role).toBe(true);
    }
  });

  /**
   * The client's own example, and the reason this module exists: "a broker
   * (mark) makes a commission with us, we need to give him a 1099".
   */
  it('lets Mark read the 1099 filed about him', () => {
    expect(mayRead(mark, marksTaxForm)).toBe(true);
  });

  it('does NOT let another broker read it', () => {
    expect(mayRead(barry, marksTaxForm)).toBe(false);
  });

  it('does not let an assistant read it either', () => {
    expect(mayRead(assistant, marksTaxForm)).toBe(false);
  });

  it('lets administrators read it — somebody has to see what was filed', () => {
    expect(mayRead(admin, marksTaxForm)).toBe(true);
    expect(mayRead(superAdmin, marksTaxForm)).toBe(true);
  });

  it('lets the uploader read their own private file', () => {
    const barrysOwn: UploadAccessFacts = {
      visibility: UploadVisibility.PRIVATE,
      ownerUserId: null,
      uploadedById: barry.id,
    };
    expect(mayRead(barry, barrysOwn)).toBe(true);
    expect(mayRead(mark, barrysOwn)).toBe(false);
  });

  /**
   * A null owner must never match a caller whose id is somehow absent — the
   * comparison has to be to a real id, not to two nullish values agreeing.
   */
  it('treats a null owner as nobody, not as everybody', () => {
    const orphan: UploadAccessFacts = {
      visibility: UploadVisibility.PRIVATE,
      ownerUserId: null,
      uploadedById: null,
    };
    expect(mayRead(barry, orphan)).toBe(false);
    expect(mayRead(mark, orphan)).toBe(false);
  });
});

describe('the list filter agrees with the row check', () => {
  it('gives administrators no restriction at all', () => {
    expect(visibilityWhere(admin)).toEqual({});
    expect(administersUsers(admin)).toBe(true);
  });

  it('gives everyone else exactly the three branches of mayRead', () => {
    expect(visibilityWhere(barry)).toEqual({
      OR: [
        { visibility: UploadVisibility.PUBLIC },
        { uploadedById: barry.id },
        { ownerUserId: barry.id },
      ],
    });
  });

  /**
   * The two functions are one rule written twice, so drift between them is a
   * leak that arrives a page early. This walks every combination and asserts
   * the SQL branches admit exactly what `mayRead` admits.
   */
  it('matches mayRead for every combination of owner and uploader', () => {
    const people = [mark.id, barry.id, null];
    for (const visibility of [UploadVisibility.PUBLIC, UploadVisibility.PRIVATE]) {
      for (const ownerUserId of people) {
        for (const uploadedById of people) {
          const row = { visibility, ownerUserId, uploadedById };
          const where = visibilityWhere(barry) as {
            OR?: Record<string, unknown>[];
          };

          const sqlWouldMatch = where.OR
            ? where.OR.some((clause) =>
                Object.entries(clause).every(
                  ([key, value]) => row[key as keyof typeof row] === value,
                ),
              )
            : true;

          expect(sqlWouldMatch, JSON.stringify(row)).toBe(mayRead(barry, row));
        }
      }
    }
  });
});

describe('who may remove or restore an upload', () => {
  it('lets the uploader and administrators remove a file', () => {
    expect(mayManage(admin, marksTaxForm)).toBe(true);
    expect(mayManage(superAdmin, marksTaxForm)).toBe(true);
    const barrysOwn = { ...marksTaxForm, ownerUserId: null, uploadedById: barry.id };
    expect(mayManage(barry, barrysOwn)).toBe(true);
  });

  /** Read is wide for a PUBLIC file; removal must not follow it. */
  it('does not let a broker remove a public photo they can read', () => {
    expect(mayRead(mark, brochure)).toBe(true);
    expect(mayManage(mark, brochure)).toBe(false);
    expect(mayManage(assistant, brochure)).toBe(false);
  });

  it('does not let the person a document is filed about remove it', () => {
    expect(mayRead(mark, marksTaxForm)).toBe(true);
    expect(mayManage(mark, marksTaxForm)).toBe(false);
  });
});

describe('administrators are decided by the stored role', () => {
  it('is SUPER_ADMIN and ADMIN, and no one else', () => {
    expect(administersUsers(admin)).toBe(true);
    expect(administersUsers(superAdmin)).toBe(true);
    for (const actor of [mark, assistant, { id: 'agent-1', role: UserRole.REFERRAL_AGENT }]) {
      expect(administersUsers(actor), actor.role).toBe(false);
    }
  });
});
