import { BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('HTTP error paths', () => {
  it.each([
    ['/api/webhooks/whatsapp?hub.verify_token=secret-marker&hub.mode=wrong', 'secret-marker', new ForbiddenException(), 403],
    ['/api/clients?search=Marcus', 'Marcus', new BadRequestException(), 400],
  ] as const)('omits the query from the error body and logs for %s', (url, marker, exception, code) => {
    const logs = (['warn', 'error', 'log', 'debug', 'verbose', 'fatal'] as const)
      .map((method) => vi.spyOn(Logger.prototype, method).mockImplementation(() => {}));
    try {
      const json = vi.fn();
      const status = vi.fn(() => ({ json }));
      const filter = new AllExceptionsFilter();
      filter.catch(exception, {
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', url }),
          getResponse: () => ({ status }),
        }),
      } as never);

      const path = url.split('?')[0];
      expect(status).toHaveBeenCalledExactlyOnceWith(code);
      expect(json).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ path, statusCode: code }));
      expect(logs[0]).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`GET ${path} -> ${code}`));
      expect(JSON.stringify(json.mock.calls)).not.toContain(marker);
      expect(JSON.stringify(logs.flatMap((log) => log.mock.calls))).not.toContain(marker);
    } finally {
      vi.restoreAllMocks();
    }
  });
});
