import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { lastFour, SecretBox, SecretOpenError } from './secret-box.js';

const box = (key: number) => new SecretBox({ settingsEncryptionKey: Buffer.alloc(32, key).toString('base64') } as never);
const plain = 'credential-fixture 🔐';

describe('SecretBox', () => {
  it('round-trips a secret and uses a fresh 12-byte IV on every v1 seal', () => {
    const secrets = box(1);
    const first = secrets.sealSecret(plain);
    const second = secrets.sealSecret(plain);
    expect(first).not.toBe(second);
    expect(first).not.toContain(plain);
    const [version, iv, tag] = first.split(':');
    expect(version).toBe('v1');
    expect(Buffer.from(iv, 'base64')).toHaveLength(12);
    expect(Buffer.from(tag, 'base64')).toHaveLength(16);
    expect(secrets.openSecret(first)).toBe(plain);
    expect(secrets.openSecret(second)).toBe(plain);
  });

  it('rejects a tampered tag, unsupported version and wrong key with a safe error', () => {
    const secrets = box(1);
    const sealed = secrets.sealSecret(plain);
    const [version, iv, tag, ciphertext] = sealed.split(':');
    const changed = Buffer.from(tag, 'base64');
    changed[0] ^= 1;
    expect(() => secrets.openSecret([version, iv, changed.toString('base64'), ciphertext].join(':'))).toThrow(SecretOpenError);
    expect(() => secrets.openSecret(sealed.replace('v1:', 'v2:'))).toThrow(SecretOpenError);
    expect(() => box(2).openSecret(sealed)).toThrow(SecretOpenError);
  });

  it('never logs the secret or exposes a complete short value in its suffix', () => {
    const spies = (['warn', 'error', 'log'] as const).map((method) => vi.spyOn(Logger.prototype, method).mockImplementation(() => {}));
    try {
      const sealed = box(1).sealSecret(plain);
      expect(() => box(2).openSecret(sealed)).toThrow('The stored secret could not be opened');
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
      expect(lastFour('fixture-abcd')).toBe('abcd');
      expect(lastFour('abcd')).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
