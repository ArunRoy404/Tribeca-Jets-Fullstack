import { describe, expect, it } from 'vitest';
import { sniffContentType } from './file-signature.js';

/**
 * These are the tests that matter most in this module.
 *
 * Every other protection around stored files assumes `contentType` is what the
 * bytes actually are. If this function can be talked into agreeing with a
 * sender's header, the download route will one day hand a browser an HTML file
 * from the API's own origin, with the session cookie attached.
 */

const bytes = (...values: number[]) => Buffer.from(values);
const text = (value: string) => Buffer.from(value, 'utf8');

/** A minimal zip containing a part path, which is how DOCX and XLSX differ. */
const zipContaining = (path: string) =>
  Buffer.concat([bytes(0x50, 0x4b, 0x03, 0x04), text(path)]);

describe('sniffContentType', () => {
  it('recognises the formats the desk exchanges', () => {
    expect(sniffContentType(text('%PDF-1.7\nhello'), undefined)).toBe(
      'application/pdf',
    );
    expect(
      sniffContentType(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00),
        undefined,
      ),
    ).toBe('image/png');
    expect(sniffContentType(bytes(0xff, 0xd8, 0xff, 0xe0), undefined)).toBe(
      'image/jpeg',
    );
    expect(sniffContentType(text('GIF89a....'), undefined)).toBe('image/gif');
  });

  it('identifies WEBP by its second marker, not the RIFF container', () => {
    const webp = Buffer.concat([
      text('RIFF'),
      bytes(0x24, 0x00, 0x00, 0x00),
      text('WEBP'),
    ]);
    expect(sniffContentType(webp, undefined)).toBe('image/webp');

    // A RIFF file that is not a WEBP must not be accepted as one.
    const wav = Buffer.concat([
      text('RIFF'),
      bytes(0x24, 0x00, 0x00, 0x00),
      text('WAVE'),
    ]);
    expect(sniffContentType(wav, undefined)).toBeNull();
  });

  it('tells a DOCX from an XLSX by the parts inside the archive', () => {
    expect(sniffContentType(zipContaining('word/document.xml'), undefined)).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(sniffContentType(zipContaining('xl/workbook.xml'), undefined)).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('refuses a plain zip', () => {
    // An archive is a way to carry whatever is inside it past a content check,
    // and the desk does not exchange them.
    expect(sniffContentType(zipContaining('payload.exe'), undefined)).toBeNull();
  });

  it('ignores the declared type for binary formats', () => {
    // The whole point: a PNG announced as a PDF is still a PNG, and an
    // executable announced as a PDF is neither.
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(sniffContentType(png, 'application/pdf')).toBe('image/png');

    const elf = bytes(0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01);
    expect(sniffContentType(elf, 'application/pdf')).toBeNull();
  });

  it('never returns a script-bearing type, however the file is labelled', () => {
    // HTML and SVG both execute in a browser. Neither has a magic number, so
    // the text branch is what must refuse to name them — it only ever answers
    // text/plain or text/csv.
    const html = text('<html><script>alert(1)</script></html>');
    expect(sniffContentType(html, 'text/html')).toBe('text/plain');

    const svg = text('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(sniffContentType(svg, 'image/svg+xml')).toBe('text/plain');
  });

  it('uses the declared type only to choose between plain text and CSV', () => {
    const csv = text('name,amount\nMark,1200\n');
    expect(sniffContentType(csv, 'text/csv')).toBe('text/csv');
    expect(sniffContentType(csv, 'text/plain')).toBe('text/plain');
    expect(sniffContentType(csv, undefined)).toBe('text/plain');
  });

  it('refuses binary wearing a text label', () => {
    // A NUL byte is the clearest single signal that something binary has been
    // given a .csv extension.
    expect(sniffContentType(bytes(0x41, 0x00, 0x42), 'text/csv')).toBeNull();

    // Invalid UTF-8: a lone continuation byte.
    expect(sniffContentType(bytes(0xc3, 0x28), 'text/plain')).toBeNull();

    // A stray control character that is not tab, newline or carriage return.
    expect(sniffContentType(bytes(0x41, 0x07, 0x42), 'text/plain')).toBeNull();
  });

  it('accepts the whitespace that real text files contain', () => {
    const withWhitespace = text('a\tb\r\nc\n');
    expect(sniffContentType(withWhitespace, 'text/plain')).toBe('text/plain');
  });

  it('refuses a truncated header rather than guessing', () => {
    // Two bytes of a JPEG header are not a JPEG.
    expect(sniffContentType(bytes(0xff, 0xd8), undefined)).toBeNull();
  });

  it('reads an empty file as text, which the service rejects on size first', () => {
    // Zero bytes satisfy every text rule vacuously. Nothing here can tell an
    // empty file from an empty note, so the emptiness check belongs where the
    // size is already known — FilesService.resolveContentType refuses it
    // before this function is ever called.
    expect(sniffContentType(Buffer.alloc(0), 'application/pdf')).toBe(
      'text/plain',
    );
  });
});
