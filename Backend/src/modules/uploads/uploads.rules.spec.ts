import { describe, expect, it } from 'vitest';
import { UploadKind } from '../../generated/prisma/enums.js';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_KIND_RULES,
  formatBytes,
  ruleFor,
} from './uploads.rules.js';

describe('upload kind rules', () => {
  it('sends each kind to the folder the client asked for', () => {
    expect(ruleFor(UploadKind.IMAGE).folder).toBe('images');
    expect(ruleFor(UploadKind.DOCUMENT).folder).toBe('documents');
  });

  it('covers every kind, so a new one cannot ship without a rule', () => {
    for (const kind of Object.values(UploadKind)) {
      expect(UPLOAD_KIND_RULES[kind]).toBeDefined();
    }
  });

  it('gives every accepted type an extension, so no key is written bare', () => {
    for (const rule of Object.values(UPLOAD_KIND_RULES)) {
      for (const type of rule.accept) {
        expect(rule.extensions[type], type).toMatch(/^\.[a-z0-9]+$/);
      }
    }
  });

  /**
   * SVG is a document that executes script. Serving one from the API's own
   * origin is stored XSS wearing an image's clothes, so it must never appear
   * on an allowlist however convenient it looks.
   */
  it('never accepts SVG', () => {
    for (const rule of Object.values(UPLOAD_KIND_RULES)) {
      expect(rule.accept).not.toContain('image/svg+xml');
    }
  });

  /**
   * Legacy .doc and .xls are OLE2 and byte-identical at the header, so
   * accepting them would mean trusting the sender's declared type — the exact
   * thing reading the bytes exists to avoid.
   */
  it('never accepts legacy Office or archive formats', () => {
    const refused = [
      'application/msword',
      'application/vnd.ms-excel',
      'application/zip',
      'application/x-rar-compressed',
    ];
    for (const rule of Object.values(UPLOAD_KIND_RULES)) {
      for (const type of refused) expect(rule.accept).not.toContain(type);
    }
  });

  it('keeps images and documents disjoint, so a kind is unambiguous', () => {
    const images = new Set(UPLOAD_KIND_RULES.IMAGE.accept);
    const overlap = UPLOAD_KIND_RULES.DOCUMENT.accept.filter((t) =>
      images.has(t),
    );
    expect(overlap).toEqual([]);
  });

  /**
   * Multer needs one limit before it knows which route it is feeding, so the
   * outer gate has to be at least the largest per-kind ceiling — otherwise the
   * bigger route is silently capped at the smaller one's limit.
   */
  it('sets the multer gate to the largest per-kind ceiling', () => {
    const largest = Math.max(
      ...Object.values(UPLOAD_KIND_RULES).map((r) => r.maxBytes),
    );
    expect(MAX_UPLOAD_BYTES).toBe(largest);
    for (const rule of Object.values(UPLOAD_KIND_RULES)) {
      expect(rule.maxBytes).toBeLessThanOrEqual(MAX_UPLOAD_BYTES);
    }
  });

  it('formats sizes the way an error message should read', () => {
    expect(formatBytes(15 * 1024 * 1024)).toBe('15 MB');
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
