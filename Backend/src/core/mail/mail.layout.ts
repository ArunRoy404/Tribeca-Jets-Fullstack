/**
 * The one HTML shell every outbound email is built in.
 *
 * Email clients are not browsers: Gmail strips `<style>` in places, Outlook
 * renders with Word, and dark mode rewrites colours. So this is the
 * conservative dialect — nested tables, inline styles, web-safe fonts, no
 * images required — and it reads correctly with images blocked.
 *
 * The brand comes from the company's settings (#26) through `brand`: the
 * logo when one is uploaded (an absolute, public URL — an inbox cannot send
 * our session cookie), otherwise the company name as a text wordmark. Every
 * value
 * that came from a person is escaped here, so a client named `<script>` is a
 * name, not markup.
 */

const COLOR = {
  page: '#f2f3f6',
  ink: '#0d1220',
  text: '#3a3f4f',
  muted: '#8a8f9c',
  rule: '#e5e7ec',
  gold: '#b8996a',
  goldSoft: '#f8f5ef',
  codeBg: '#f6f7f9',
} as const;

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailContent {
  /** The grey preview line an inbox shows beside the subject. */
  preheader: string;
  /** A small uppercase label above the heading — "Sign-in verification". */
  eyebrow?: string;
  /** Omitted for a composed message, whose subject line is its heading. */
  heading?: string;
  /** Plain text, escaped here. A blank string is skipped. */
  paragraphs?: string[];
  /** Already-escaped HTML for the body — only `renderMessage` builds one. */
  bodyHtml?: string;
  /** A one-time code, shown large and spaced. */
  code?: { value: string; caption: string };
  /** Labelled values in a box — an invitation's email and first password. */
  credentials?: { label: string; value: string }[];
  button?: { label: string; href: string };
  /** A boxed line with a gold rule — the "if this wasn't you" warning. */
  notice?: string;
  /** Paragraphs after the code/button, before the notice. */
  after?: string[];
  /**
   * `system` — automated, replies unmonitored. `personal` — a message a
   * person wrote, whose replies reach them.
   */
  footer?: 'system' | 'personal';
  /** The company, from Settings. Absent only in tests. */
  brand?: EmailBrand;
  /** @deprecated pass `brand.logoUrl`; kept for existing callers. */
  logoUrl?: string | null;
}

/** Who the email is from, as the company's settings name it. */
export interface EmailBrand {
  name: string;
  /** Absolute and publicly reachable, or null for the text wordmark. */
  logoUrl?: string | null;
}

/** The shell's own default, for a caller with no settings to hand (tests). */
const DEFAULT_BRAND: EmailBrand = { name: 'Tribeca Jets', logoUrl: null };

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${COLOR.text};">${text}</p>`;
}

function header(brand: EmailBrand): string {
  const name = escapeHtml(brand.name);
  const mark = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${name}" height="40" style="display:block;height:40px;width:auto;border:0;">`
    : `<div style="font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:7px;color:#ffffff;">${name.toUpperCase().replace(/ /g, '&nbsp;')}</div>
       <div style="margin-top:6px;font-family:${FONT};font-size:10px;letter-spacing:3.5px;color:#9aa1b5;">COMMAND&nbsp;CENTER</div>`;
  return `<tr><td style="background:${COLOR.ink};padding:30px 40px;border-radius:10px 10px 0 0;">${mark}</td></tr>
    <tr><td style="background:${COLOR.gold};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>`;
}

function codeBlock(code: { value: string; caption: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td align="center" style="background:${COLOR.codeBg};border:1px solid ${COLOR.rule};border-radius:8px;padding:26px 16px;">
      <div style="font-family:${MONO};font-size:34px;font-weight:600;letter-spacing:12px;color:${COLOR.ink};padding-left:12px;">${escapeHtml(code.value)}</div>
      <div style="margin-top:12px;font-family:${FONT};font-size:12px;letter-spacing:0.3px;color:${COLOR.muted};">${escapeHtml(code.caption)}</div>
    </td></tr></table>`;
}

function credentials(rows: { label: string; value: string }[]): string {
  const cells = rows
    .map(
      (row, i) => `<tr>
        <td style="padding:${i ? '12px' : '0'} 0 0;font-family:${FONT};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${COLOR.muted};">${escapeHtml(row.label)}</td>
      </tr><tr>
        <td style="padding:4px 0 0;font-family:${MONO};font-size:16px;font-weight:600;color:${COLOR.ink};word-break:break-all;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td style="background:${COLOR.codeBg};border:1px solid ${COLOR.rule};border-radius:8px;padding:20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>
    </td></tr></table>`;
}

function button(action: { label: string; href: string }): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td style="background:${COLOR.ink};border-radius:6px;">
      <a href="${escapeHtml(action.href)}" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:0.4px;color:#ffffff;text-decoration:none;">${escapeHtml(action.label)}</a>
    </td></tr></table>`;
}

function notice(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">
    <tr><td style="background:${COLOR.goldSoft};border-left:3px solid ${COLOR.gold};padding:14px 18px;font-family:${FONT};font-size:13px;line-height:20px;color:${COLOR.text};">${escapeHtml(text)}</td></tr></table>`;
}

function footer(kind: 'system' | 'personal', brand: EmailBrand): string {
  const name = escapeHtml(brand.name);
  const line =
    kind === 'system'
      ? `This is an automated message from ${name} Command Center. Replies to this address are not monitored.`
      : `Sent from ${name} Command Center. Reply to this email to reach the sender directly.`;
  return `<tr><td style="padding:24px 40px 0;font-family:${FONT};font-size:11px;line-height:18px;color:${COLOR.muted};text-align:center;">
      ${line}<br>&copy; ${new Date().getFullYear()} ${name}
    </td></tr>`;
}

/** The full HTML document for one email. */
export function renderEmail(content: EmailContent): string {
  const brand: EmailBrand = content.brand ?? { ...DEFAULT_BRAND, logoUrl: content.logoUrl ?? null };
  const body = [
    content.eyebrow
      ? `<div style="margin:0 0 10px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:2.2px;text-transform:uppercase;color:${COLOR.gold};">${escapeHtml(content.eyebrow)}</div>`
      : '',
    content.heading
      ? `<h1 style="margin:0 0 20px;font-family:${FONT};font-size:23px;line-height:31px;font-weight:600;color:${COLOR.ink};">${escapeHtml(content.heading)}</h1>`
      : '',
    content.bodyHtml ?? '',
    ...(content.paragraphs ?? []).filter(Boolean).map((text) => paragraph(escapeHtml(text))),
    content.code ? codeBlock(content.code) : '',
    content.credentials?.length ? credentials(content.credentials) : '',
    content.button ? button(content.button) : '',
    ...(content.after ?? []).filter(Boolean).map((text) => paragraph(escapeHtml(text))),
    content.notice ? notice(content.notice) : '',
  ].join('\n');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.heading ?? content.preheader)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.page};">
  <tr><td align="center" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      ${header(brand)}
      <tr><td style="background:#ffffff;padding:40px 40px 28px;border-radius:0 0 10px 10px;border:1px solid ${COLOR.rule};border-top:0;">
        ${body}
      </td></tr>
      ${footer(content.footer ?? 'system', brand)}
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** URLs in a composed message become links; everything else stays text. */
function linkify(escaped: string): string {
  return escaped.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    `<a href="$1" style="color:${COLOR.ink};text-decoration:underline;">$1</a>`,
  );
}

/**
 * A message a person wrote (Email Templates, #21) in the same shell: blank
 * lines are paragraphs, single newlines are line breaks, links are links.
 * No heading — the subject line is the heading, and repeating it in the body
 * reads as a newsletter rather than a letter.
 */
export function renderMessage(text: string, preheader: string, brand?: EmailBrand): string {
  const bodyHtml = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => paragraph(linkify(escapeHtml(block)).replace(/\n/g, '<br>')))
    .join('\n');
  return renderEmail({ preheader, bodyHtml, footer: 'personal', brand });
}
