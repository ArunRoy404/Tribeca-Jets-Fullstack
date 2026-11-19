import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WhatsappSender } from './whatsapp.sender.js';

const config = { graphVersion: 'v25.0', phoneNumberId: '4321', accessToken: 'PRIVATE_ACCESS_TOKEN' };
const url = 'https://graph.facebook.com/v25.0/4321/messages';
const phone = '15551239876';
const text = 'PRIVATE REPLY TEXT';
const meta = { code: 190, error_subcode: 463, type: 'OAuthException', fbtrace_id: 'trace-id',
  message: 'PRIVATE META MESSAGE', error_data: { details: 'PRIVATE PARAMETER' } };

describe('WhatsappSender', () => {
  const sender = new WhatsappSender({ whatsapp: config } as never);
  const post = vi.fn<typeof fetch>();
  let logs: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', post.mockReset());
    logs = (['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((method) =>
      vi.spyOn(Logger.prototype, method).mockImplementation(() => {}),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it.each([undefined, 'wamid.question'])('sends text with reply context only when given %s', async (id) => {
    post.mockResolvedValue(new Response(null, { status: 201 }));
    expect(await sender.sendText(phone, text, id)).toBe(true);
    expect(post).toHaveBeenCalledExactlyOnceWith(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      signal: expect.any(AbortSignal),
      body: expect.any(String),
    });
    expect(JSON.parse(post.mock.calls[0]?.[1]?.body as string)).toEqual({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text',
      text: { preview_url: false, body: text }, ...(id ? { context: { message_id: id } } : {}),
    });
  });

  it('reports a 400 and rejected token without retrying or logging private fields', async () => {
    post.mockResolvedValue(Response.json({ error: meta }, { status: 400 }));
    expect(await sender.sendText(phone, text)).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
    expect(logs[2]).toHaveBeenCalledWith('WhatsApp access token rejected (code 190): renew WHATSAPP_ACCESS_TOKEN');
    const logged = JSON.stringify(logs.map((log) => log.mock.calls));
    for (const value of ['HTTP 400', '190', '463', meta.type, meta.fbtrace_id]) expect(logged).toContain(value);
    for (const value of [phone, config.accessToken, text, meta.message, meta.error_data.details]) {
      expect(logged).not.toContain(value);
    }
  });

  it.each([
    [500, 200, true], [500, 500, false], [429, 200, true], ['network', 200, true], ['timeout', 200, true],
  ] as const)('retries %s once, then returns the outcome of HTTP %s', async (first, second, expected) => {
    if (typeof first === 'number') post.mockResolvedValueOnce(new Response(null, { status: first }));
    else post.mockRejectedValueOnce(first === 'timeout' ? new DOMException('Timeout', 'TimeoutError') : new TypeError('fetch failed'));
    post.mockResolvedValueOnce(new Response(null, { status: second }));
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const sending = sender.sendText(phone, text);
    await vi.advanceTimersByTimeAsync(999);
    expect(post).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(await sending).toBe(expected);
    expect(post).toHaveBeenCalledTimes(2);
    expect(timeout.mock.calls).toEqual([[10_000], [10_000]]);
  });

  it('makes no request while unconfigured', async () => {
    const disabled = new WhatsappSender({ whatsapp: null } as never);
    expect(await disabled.sendText(phone, text)).toBe(false);
    await disabled.markRead('wamid.question');
    expect(post).not.toHaveBeenCalled();
  });

  it('marks the message read with a typing indicator and warns only with status and code on failure', async () => {
    post.mockResolvedValue(Response.json({ error: meta }, { status: 503 }));
    await expect(sender.markRead('wamid.question')).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledExactlyOnceWith(url, expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(post.mock.calls[0]?.[1]?.body as string)).toEqual({
      messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.question', typing_indicator: { type: 'text' },
    });
    expect(logs[1]).toHaveBeenCalledExactlyOnceWith('WhatsApp mark read failed (HTTP 503, code 190)');
  });

  const uploadUrl = 'https://graph.facebook.com/v25.0/4321/media';
  const file = { body: Buffer.from('%PDF PRIVATE BYTES'), filename: 'PRIVATE-REF.pdf', contentType: 'application/pdf' };
  const caption = 'PRIVATE CAPTION';
  const uploaded = () => Response.json({ id: 'media-id' });

  it.each([undefined, 'wamid.question'])('uploads the PDF and sends a document with reply context %s', async (id) => {
    post.mockResolvedValueOnce(uploaded()).mockResolvedValueOnce(new Response(null, { status: 200 }));
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    expect(await sender.sendDocument(phone, file, id ? caption : undefined, id)).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenNthCalledWith(1, uploadUrl, {
      method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}` },
      body: expect.any(FormData), signal: expect.any(AbortSignal),
    });
    const form = post.mock.calls[0]?.[1]?.body as FormData;
    expect(form.get('messaging_product')).toBe('whatsapp');
    expect(form.get('type')).toBe(file.contentType);
    const part = form.get('file') as File;
    expect(part).toBeInstanceOf(Blob);
    expect(part.name).toBe(file.filename);
    expect(part.type).toBe(file.contentType);
    expect(Buffer.from(await part.arrayBuffer())).toEqual(file.body);
    expect(post).toHaveBeenNthCalledWith(2, url, {
      method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' },
      body: expect.any(String), signal: expect.any(AbortSignal),
    });
    expect(JSON.parse(post.mock.calls[1]?.[1]?.body as string)).toEqual({
      messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'document',
      document: { id: 'media-id', filename: file.filename, ...(id ? { caption } : {}) },
      ...(id ? { context: { message_id: id } } : {}),
    });
    expect(timeout.mock.calls).toEqual([[30_000], [10_000]]);
  });

  it('retries an upload returning 500 and sends once it succeeds', async () => {
    post.mockResolvedValueOnce(new Response(null, { status: 500 })).mockResolvedValueOnce(uploaded())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const sending = sender.sendDocument(phone, file);
    await vi.runAllTimersAsync();
    expect(await sending).toBe(true);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual([uploadUrl, uploadUrl, url]);
  });

  it('retries a document send returning 429 without uploading again', async () => {
    post.mockResolvedValueOnce(uploaded()).mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const sending = sender.sendDocument(phone, file);
    await vi.runAllTimersAsync();
    expect(await sending).toBe(true);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual([uploadUrl, url, url]);
  });

  it.each([false, true])('returns false after two network failures (upload succeeded: %s)', async (uploadSucceeded) => {
    if (uploadSucceeded) post.mockResolvedValueOnce(uploaded());
    post.mockRejectedValue(new TypeError(`Failed to send ${file.filename}`));
    const sending = sender.sendDocument(phone, file);
    await vi.runAllTimersAsync();
    expect(await sending).toBe(false);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual(uploadSucceeded ? [uploadUrl, url, url] : [uploadUrl, uploadUrl]);
    expect(JSON.stringify(logs.flatMap((log) => log.mock.calls))).not.toContain(file.filename);
  });

  it.each([false, true])('does not retry HTTP 400 and logs only safe fields (upload succeeded: %s)', async (uploadSucceeded) => {
    if (uploadSucceeded) post.mockResolvedValueOnce(uploaded());
    post.mockResolvedValueOnce(Response.json({ error: { ...meta, type: file.filename, fbtrace_id: phone } }, { status: 400 }));
    expect(await sender.sendDocument(phone, file, caption)).toBe(false);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual(uploadSucceeded ? [uploadUrl, url] : [uploadUrl]);
    expect(logs[2]).toHaveBeenCalledWith('WhatsApp access token rejected (code 190): renew WHATSAPP_ACCESS_TOKEN');
    const logged = JSON.stringify(logs.flatMap((log) => log.mock.calls));
    for (const value of [file.filename, caption, config.accessToken, meta.message, phone, file.body.toString()]) {
      expect(logged).not.toContain(value);
    }
    for (const value of ['HTTP 400', '190', '463', '1 KB']) expect(logged).toContain(value);
  });

  it('refuses an upload response without a media id', async () => {
    post.mockResolvedValueOnce(Response.json({ id: '' }));
    expect(await sender.sendDocument(phone, file)).toBe(false);
    expect(post.mock.calls.map(([endpoint]) => endpoint)).toEqual([uploadUrl]);
  });

  it('refuses an oversized PDF or missing configuration before fetching', async () => {
    const disabled = new WhatsappSender({ whatsapp: null } as never);
    expect(await disabled.sendDocument(phone, file)).toBe(false);
    expect(await sender.sendDocument(phone, { ...file, body: Buffer.alloc(10 * 1024 * 1024 + 1) }, caption)).toBe(false);
    expect(post).not.toHaveBeenCalled();
    expect(logs[1]).toHaveBeenCalledExactlyOnceWith('WhatsApp document exceeds the upload limit (10241 KB)');
  });
});
