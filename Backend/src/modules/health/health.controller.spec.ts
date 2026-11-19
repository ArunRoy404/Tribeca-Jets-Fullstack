import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';

describe('health AI readiness', () => {
  it.each([
    [null, 'not_configured'],
    [{ apiKey: 'key-fixture', model: 'model-fixture' }, 'configured'],
  ] as const)('reports panel readiness as %j → %s', async (config, expected) => {
    const ai = vi.fn().mockResolvedValue(config);
    const health = new HealthController(
      { $queryRaw: vi.fn().mockResolvedValue([]) } as never,
      { client: { ping: vi.fn().mockResolvedValue('PONG') } } as never,
      { driverName: 'local' } as never,
      { nodeEnv: 'test' } as never,
      { ai } as never,
    );
    const body = await health.check();
    expect(ai).toHaveBeenCalledOnce();
    expect(body.services.ai).toBe(expected);
    expect(body.status).toBe('ok');
    expect(JSON.stringify(body)).not.toContain('key-fixture');
  });
});
