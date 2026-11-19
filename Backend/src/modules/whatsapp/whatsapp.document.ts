export interface WhatsappDocument {
  body: Buffer;
  filename: string;
  contentType: string;
}

export function documentSizeKb(bytes: number): number {
  return Math.ceil(bytes / 1024);
}
