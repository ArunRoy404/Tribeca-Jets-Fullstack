import { Logger } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_KEY } from '../../common/constants/auth.constants.js';
import { TestWhatsappMetaDto } from './dto/whatsapp-settings.dto.js';
import { WhatsappConnectionsService } from './whatsapp-connections.service.js';
import { WhatsappSettingsController } from './whatsapp-settings.controller.js';

const openAiFixture = 'openai-key-fixture';
const metaFixture = 'meta-token-fixture';

describe('WhatsApp settings connection tests', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const settings = {
    openAiTestKey: vi.fn(),
    metaTestSettings: vi.fn(),
  };
  const connections = new WhatsappConnectionsService(settings as never);
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock.mockReset());
    settings.openAiTestKey.mockReset().mockResolvedValue(openAiFixture);
    settings.metaTestSettings.mockReset().mockResolvedValue({
      accessToken: metaFixture, phoneNumberId: '1234', graphVersion: 'v25.0',
    });
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists chat models using a draft key over the saved key', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const ids = [
      'o4-mini', 'gpt-old', 'gpt-new', 'chatgpt-latest', 'gpt-new', 'text-embedding-3', 'other',
      ...['tts', 'whisper', 'dall-e', 'image', 'audio', 'realtime', 'transcribe', 'search', 'moderation', 'instruct', 'embedding']
        .map((label) => `gpt-${label}`),
    ];
    fetchMock.mockResolvedValueOnce(Response.json({ data: ids.map((id) => ({ id })) }));
    const reply = await connections.testOpenAi({ apiKey: 'draft-key-fixture' });
    expect(reply).toEqual({ ok: true, models: ['o4-mini', 'gpt-old', 'gpt-new', 'chatgpt-latest'] });
    expect(settings.openAiTestKey).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://api.openai.com/v1/models', expect.objectContaining({
      method: 'GET', headers: { Authorization: 'Bearer draft-key-fixture' }, redirect: 'error',
    }));
    expect(timeout).toHaveBeenCalledExactlyOnceWith(10_000);
    expect(log.mock.calls.flat()).toEqual(['Connection test HTTP 200']);
  });

  it.each([401, 403])('uses the saved key and maps the OpenAI %d response to a safe 400', async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: { message: openAiFixture } }, { status }));
    await expect(connections.testOpenAi({})).rejects.toMatchObject({ status: 400, message: 'OpenAI refused this key' });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('https://api.openai.com/v1/models', expect.objectContaining({
      headers: { Authorization: `Bearer ${openAiFixture}` },
    }));
    expect(log.mock.calls.flat()).toEqual([`Connection test HTTP ${status}`]);
  });

  it('reports an absent key without starting a fetch', async () => {
    settings.openAiTestKey.mockResolvedValue(null);
    await expect(connections.testOpenAi({})).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps OpenAI outages, timeouts and malformed replies to 502', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ data: null }));
    for (const _result of [1, 2, 3]) {
      await expect(connections.testOpenAi({})).rejects.toMatchObject({ status: 502, message: 'Could not reach OpenAI' });
    }
  });

  it('uses Meta draft fields where present and returns only the connection metadata', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      display_phone_number: '+1 555-123-4567', verified_name: 'Test Number', secret: metaFixture,
    }));
    const reply = await connections.testMeta({ graphVersion: 'v26.1', accessToken: 'draft-meta-token' });
    expect(reply).toEqual({ ok: true, displayPhoneNumber: '+1 555-123-4567', verifiedName: 'Test Number' });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://graph.facebook.com/v26.1/1234?fields=display_phone_number,verified_name',
      expect.objectContaining({ method: 'GET', headers: { Authorization: 'Bearer draft-meta-token' } }),
    );
    expect(log.mock.calls.flat()).toEqual(['Connection test HTTP 200']);
  });

  it.each([
    [400, 190, 'Meta refused the access token'],
    [400, 100, 'Meta has no phone number with that ID'],
    [404, null, 'Meta has no phone number with that ID'],
  ] as const)('maps Meta HTTP %d and code %s to a safe 400', async (status, code, message) => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: { code, message: metaFixture } }, { status }));
    await expect(connections.testMeta({})).rejects.toMatchObject({ status: 400, message });
    expect(log.mock.calls.flat()).toEqual([`Connection test HTTP ${status}`]);
  });

  it('maps Meta transport failures and 5xx to 502', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network failed')).mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(connections.testMeta({})).rejects.toMatchObject({ status: 502, message: 'Could not reach Meta' });
    await expect(connections.testMeta({})).rejects.toMatchObject({ status: 502, message: 'Could not reach Meta' });
  });

  it('validates the Graph version and ID before they can enter the URL', () => {
    expect(TestWhatsappMetaDto.zodSchema.safeParse({ graphVersion: '../invalid' }).success).toBe(false);
    expect(TestWhatsappMetaDto.zodSchema.safeParse({ phoneNumberId: 'https://invalid.example' }).success).toBe(false);
  });

  it.each(['testOpenAi', 'testMeta'] as const)('rate-limits %s the same as the code route', (name) => {
    const proto = WhatsappSettingsController.prototype;
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, proto[name])).toBe(200);
    expect(Reflect.getMetadata(RATE_LIMIT_KEY, proto[name])).toEqual(Reflect.getMetadata(RATE_LIMIT_KEY, Reflect.get(proto, 'sendCode')));
  });
});
