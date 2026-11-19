import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service.js';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class SecretOpenError extends Error {
  constructor() {
    super('The stored secret could not be opened');
    this.name = 'SecretOpenError';
  }
}

function decode(part: string): Buffer {
  const bytes = Buffer.from(part, 'base64');
  if (bytes.toString('base64') !== part) throw new SecretOpenError();
  return bytes;
}

@Injectable()
export class SecretBox {
  private readonly key: Buffer | undefined;

  constructor(config: AppConfigService) {
    const encoded = config.settingsEncryptionKey;
    this.key = encoded === undefined ? undefined : Buffer.from(encoded, 'base64');
  }

  get ready(): boolean { return this.key !== undefined; }

  sealSecret(plain: string): string {
    if (!this.key) throw new Error('Settings encryption is unavailable');
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_BYTES });
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [VERSION, ...[iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64'))].join(':');
  }

  openSecret(sealed: string): string {
    try {
      const [version, encodedIv, encodedTag, encodedText, extra] = sealed.split(':');
      if (!this.key || version !== VERSION || !encodedIv || !encodedTag || encodedText === undefined || extra !== undefined) {
        throw new SecretOpenError();
      }
      const iv = decode(encodedIv);
      const tag = decode(encodedTag);
      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new SecretOpenError();
      const decipher = createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_BYTES });
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(decode(encodedText)), decipher.final()]).toString('utf8');
    } catch {
      throw new SecretOpenError();
    }
  }
}

/** Short secrets have no display suffix because it would disclose the whole value. */
export function lastFour(plain: string): string | null {
  return plain.length > 4 ? plain.slice(-4) : null;
}
