import { describe, expect, it } from 'vitest';
import { escapeHtml, renderEmail, renderMessage } from './mail.layout.js';

describe('renderEmail', () => {
  const html = renderEmail({
    preheader: 'Your code is 123456',
    eyebrow: 'Sign-in verification',
    heading: 'Your sign-in code',
    paragraphs: ['Hi <b>Roy</b>,', ''],
    code: { value: '123456', caption: 'Expires in 10 minutes' },
    notice: 'Not you?',
  });

  it('escapes every value a person supplied', () => {
    expect(html).toContain('Hi &lt;b&gt;Roy&lt;/b&gt;,');
    expect(html).not.toContain('<b>Roy</b>');
  });

  it('shows the code, the preheader and the text wordmark without a logo', () => {
    expect(html).toContain('123456');
    expect(html).toContain('Your code is 123456');
    expect(html).toContain('TRIBECA&nbsp;JETS');
    expect(html).not.toContain('<img');
  });

  it('uses the logo when one is given', () => {
    expect(renderEmail({ preheader: 'x', heading: 'y', logoUrl: 'https://cdn.example.com/logo.png' })).toContain(
      '<img src="https://cdn.example.com/logo.png"',
    );
  });
});

describe('the company brand (Settings)', () => {
  const branded = renderEmail({
    preheader: 'x',
    heading: 'y',
    brand: { name: 'Acme Air & Co', logoUrl: 'https://app.example.com/api/settings/branding/logo?v=1' },
  });

  it('carries the company logo and names the company in the footer', () => {
    expect(branded).toContain('<img src="https://app.example.com/api/settings/branding/logo?v=1"');
    expect(branded).toContain('alt="Acme Air &amp; Co"');
    expect(branded).toContain('Acme Air &amp; Co Command Center');
    expect(branded).not.toContain('Tribeca');
  });

  it('falls back to the company name as the wordmark without a logo', () => {
    const html = renderEmail({ preheader: 'x', brand: { name: 'Acme Air', logoUrl: null } });
    expect(html).toContain('ACME&nbsp;AIR');
    expect(html).not.toContain('<img');
  });
});

describe('renderMessage', () => {
  it('keeps paragraphs and line breaks, links URLs, and escapes the rest', () => {
    const html = renderMessage('Hi Dana,\n\nYour quote: https://example.com/q/1\nThanks <3', 'Hi Dana');
    expect(html).toContain('Hi Dana,</p>');
    expect(html).toContain('<a href="https://example.com/q/1"');
    expect(html).toContain('<br>Thanks &lt;3');
    expect(html).toContain('Reply to this email to reach the sender directly');
  });
});

describe('escapeHtml', () => {
  it('escapes quotes for attributes', () => {
    expect(escapeHtml(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;');
  });
});

describe('isPermanentMailFailure', async () => {
  const { isPermanentMailFailure } = await import('./mail.queue.js');
  it('stops on a 5xx refusal and retries anything else', () => {
    expect(isPermanentMailFailure({ responseCode: 550 })).toBe(true);
    expect(isPermanentMailFailure({ responseCode: 421 })).toBe(false);
    expect(isPermanentMailFailure(new Error('ECONNREFUSED'))).toBe(false);
    expect(isPermanentMailFailure(null)).toBe(false);
  });
});
