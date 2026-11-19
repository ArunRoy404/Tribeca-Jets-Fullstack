import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import type { WhatsappSettingsService as Settings } from '../modules/whatsapp/whatsapp-settings.service.js';

/** Import only the former integration settings. A phone must be verified in the panel. */
export async function importWhatsappEnv(settings: Pick<Settings, 'importLegacy'>, env: NodeJS.ProcessEnv) {
  if (!env.SETTINGS_ENCRYPTION_KEY) {
    throw new Error('Set SETTINGS_ENCRYPTION_KEY on the server first');
  }
  const { imported, skipped } = await settings.importLegacy({
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL,
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    graphVersion: env.WHATSAPP_GRAPH_VERSION,
  });
  console.log(`Imported: ${imported.join(', ') || 'none'}`);
  console.log(`Skipped: ${skipped.join(', ') || 'none'}`);
  console.log('The Super Admin phone is skipped. Link it with a WhatsApp code in Settings.');
}

async function main() {
  const { config } = await import('dotenv');
  config({ path: ['.env.local', '.env'], quiet: true });
  if (!process.env.SETTINGS_ENCRYPTION_KEY) {
    console.error('Set SETTINGS_ENCRYPTION_KEY on the server first');
    return 1;
  }

  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../app.module.js');
  const { WhatsappSettingsService } = await import('../modules/whatsapp/whatsapp-settings.service.js');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false });
  try {
    await importWhatsappEnv(app.get(WhatsappSettingsService), process.env);
    return 0;
  } finally {
    await app.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().then((code) => process.exit(code), () => {
    console.error('Could not import WhatsApp settings. Check the server configuration and try again.');
    process.exit(1);
  });
}
