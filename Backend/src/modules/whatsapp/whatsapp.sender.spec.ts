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
});
