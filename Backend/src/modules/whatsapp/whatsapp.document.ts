import type { DocumentDetails } from './whatsapp-history.events.js';

export interface WhatsappDocument {
  body: Buffer;
  filename: string;
  contentType: string;
  history?: DocumentDetails;
}

export function documentSizeKb(bytes: number): number {
  return Math.ceil(bytes / 1024);
}
