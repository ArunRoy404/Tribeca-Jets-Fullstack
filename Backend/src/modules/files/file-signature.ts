/**
 * What a file actually is, read from its bytes.
 *
 * An upload's `Content-Type` header is chosen by whoever sent it, so believing
 * it means an attacker decides what the API later serves back. Store
 * `text/html` against a file the desk believes is a PDF and the download route
 * hands a browser a script running on the API's own origin, holding the
 * session cookie.
 *
 * Module-private for now — the second module that needs to sniff an upload
 * should lift this into `common/`, per AGENTS.md on extracting on the second
 * copy rather than the first.
 */

/** A magic-number signature: these bytes at this offset mean this type. */
interface Signature {
  readonly contentType: string;
  readonly offset: number;
  readonly bytes: readonly number[];
}

const ascii = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));

/**
 * Ordered most specific first. WEBP is identified by its second marker,
 * because its first four bytes are a bare `RIFF` container header that says
 * nothing about what is inside.
 */
const SIGNATURES: readonly Signature[] = [
  { contentType: 'application/pdf', offset: 0, bytes: ascii('%PDF') },
  {
    contentType: 'image/png',
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { contentType: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { contentType: 'image/gif', offset: 0, bytes: ascii('GIF87a') },
  { contentType: 'image/gif', offset: 0, bytes: ascii('GIF89a') },
  // RIFF + a four-byte length + WEBP. The length varies, so the marker at
  // offset 8 is what identifies the format.
  { contentType: 'image/webp', offset: 8, bytes: ascii('WEBP') },
];

/** ZIP local file header. DOCX and XLSX are both zip archives. */
const ZIP_HEADER = [0x50, 0x4b, 0x03, 0x04];

const DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function startsWith(
  buffer: Buffer,
  offset: number,
  bytes: readonly number[],
): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Tells a DOCX from an XLSX.
 *
 * Both are zip archives with the same header, so the difference is which
 * directory the parts live in — `word/` or `xl/`. Those names appear in the
 * archive's local file headers as plain text, so a substring search over the
 * raw bytes settles it without unzipping anything.
 *
 * Returns null for any other zip. A generic `.zip` is refused rather than
 * accepted as "some document": the desk does not exchange archives, and an
 * archive is a way to carry whatever is inside it past a content check.
 */
function classifyZip(buffer: Buffer): string | null {
  if (buffer.includes('word/')) return DOCX;
  if (buffer.includes('xl/')) return XLSX;
  return null;
}

/**
 * Control characters that never appear in a file a person typed.
 *
 * Tab (09), newline (0A) and carriage return (0D) are the three that do, which
 * is why they are the three gaps in the ranges below.
 */
// eslint-disable-next-line no-control-regex -- matching control characters is the entire purpose of this pattern.
const BINARY_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/**
 * Whether the bytes are plain text a person typed.
 *
 * Text has no magic number, so it is identified by exclusion: valid UTF-8,
 * with no NUL and no stray control characters. A NUL byte is the clearest
 * single signal that something binary is wearing a `.csv` extension.
 */
function looksLikeText(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;

  // Round-tripping through UTF-8 replaces every invalid sequence with U+FFFD,
  // so a change in byte length means the input was not valid UTF-8.
  const decoded = buffer.toString('utf8');
  if (Buffer.byteLength(decoded, 'utf8') !== buffer.length) return false;

  return !BINARY_CONTROL_CHARS.test(decoded);
}

/**
 * The content type the bytes say they are, or null if nothing recognised them.
 *
 * `declaredType` decides exactly one thing — whether text is `text/plain` or
 * `text/csv`, which are the same bytes and differ only in what the sender
 * meant by them. It is never used to accept a binary format.
 */
export function sniffContentType(
  buffer: Buffer,
  declaredType: string | undefined,
): string | null {
  for (const signature of SIGNATURES) {
    if (startsWith(buffer, signature.offset, signature.bytes)) {
      return signature.contentType;
    }
  }

  if (startsWith(buffer, 0, ZIP_HEADER)) return classifyZip(buffer);

  if (looksLikeText(buffer)) {
    return declaredType === 'text/csv' ? 'text/csv' : 'text/plain';
  }

  return null;
}
