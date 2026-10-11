import { describe, expect, it } from 'vitest';
import { MAX_FILENAME_LENGTH, cleanFilename } from './filename.js';

/** What multer hands over for a UTF-8 name: its bytes read as latin1. */
const asMulterSendsIt = (name: string) => Buffer.from(name, 'utf8').toString('latin1');

describe('cleanFilename', () => {
  it('restores accents multer decoded as latin1', () => {
    expect(cleanFilename(asMulterSendsIt('Résumé – Señor Müller.pdf'))).toBe('Résumé – Señor Müller.pdf');
    expect(cleanFilename(asMulterSendsIt('護照.pdf'))).toBe('護照.pdf');
  });

  it('leaves plain ASCII alone', () => {
    expect(cleanFilename('2025 Form 1099.pdf')).toBe('2025 Form 1099.pdf');
  });

  /** A genuine latin1 name is not valid UTF-8, so it must not be "fixed" into garbage. */
  it('keeps a name that really was latin1', () => {
    expect(cleanFilename('caf\u00e9.txt')).toBe('café.txt');
  });

  it('keeps a name that was already decoded correctly', () => {
    expect(cleanFilename('Señor.pdf')).toBe('Señor.pdf');
    expect(cleanFilename('護照.pdf')).toBe('護照.pdf');
  });

  it('drops a client-side path', () => {
    expect(cleanFilename('C:\\fakepath\\invoice.pdf')).toBe('invoice.pdf');
    expect(cleanFilename('../../etc/passwd')).toBe('passwd');
  });

  it('strips control characters that would split a header', () => {
    expect(cleanFilename('a\r\nb.pdf')).toBe('ab.pdf');
  });

  it('shortens to the column width and keeps the extension', () => {
    const cleaned = cleanFilename(`${'x'.repeat(300)}.pdf`);
    expect(Array.from(cleaned)).toHaveLength(MAX_FILENAME_LENGTH);
    expect(cleaned.endsWith('.pdf')).toBe(true);
  });

  it('never splits a multi-byte character when shortening', () => {
    const cleaned = cleanFilename(`${'😀'.repeat(300)}.pdf`);
    expect(Array.from(cleaned)).toHaveLength(MAX_FILENAME_LENGTH);
    expect(cleaned).not.toContain('\uFFFD');
  });

  it('names an empty or missing name "file"', () => {
    expect(cleanFilename('')).toBe('file');
    expect(cleanFilename(undefined)).toBe('file');
    expect(cleanFilename('   ')).toBe('file');
  });
});
