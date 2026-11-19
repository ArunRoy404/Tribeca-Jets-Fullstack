import 'reflect-metadata';
import { parseArgs } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AppConfigService } from '../config/config.service.js';
import { WhatsappAgent } from '../modules/whatsapp/whatsapp.agent.js';
import { documentSizeKb } from '../modules/whatsapp/whatsapp.document.js';
import { WhatsappService } from '../modules/whatsapp/whatsapp.service.js';

/**
 * Development tool: sends CRM data to OpenAI when configured and invoked.
 * Skips the webhook's signature, Settings switch, sender, redelivery and
 * freshness gates. It still resolves a live, active Super Admin through the
 * same query as the webhook; --as changes only which such account is used.
 *
 * Without the WhatsApp env set, --as is required and the conversation is
 * remembered under the key `0`, which no E.164 number reduces to — so the
 * brain can be tried before Meta's credentials exist without ever sharing
 * the phone's memory. Nothing imports this script. Nest's ConfigModule loads and validates env;
 * nest build emits the constructor metadata an application context needs.
 */
async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    options: { as: { type: 'string' } },
    allowPositionals: true,
  });
  const text = positionals.join(' ').trim();
  if (!text || (values.as !== undefined && !values.as.trim())) {
    throw new Error('Usage: npm run whatsapp:ask -- [--as <email>] "Your question"');
  }

  // Build the real context before checking readiness: the no-key check also
  // proves dependency injection works without constructing an OpenAI client.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
    abortOnError: false,
  });
  try {
    console.log('WhatsApp assistant application context started.');
    const config = app.get(AppConfigService);
    const missing = [
      ...(!config.ai.openaiApiKey?.trim() ? ['OPENAI_API_KEY'] : []),
      ...(!config.ai.openaiModel?.trim() ? ['OPENAI_MODEL'] : []),
    ];
    if (missing.length) throw new Error(`${missing.join(' / ')} must be set to run whatsapp:ask`);

    const whatsapp = app.get(WhatsappService);
    const user = values.as
      ? await whatsapp.adminForEmail(values.as)
      : await whatsapp.actingAdmin();
    if (!user) {
      throw new Error(values.as
        ? '--as must name an active, non-deleted SUPER_ADMIN'
        : 'Pass --as <email>, or set the six WhatsApp variables with SUPER_ADMIN_WHATSAPP_EMAIL naming an active SUPER_ADMIN');
    }
    const phone = config.whatsapp?.adminPhone ?? '0';
    const reply = await app.get(WhatsappAgent).reply(user, phone, text);
    console.log(reply.text);
    for (const { filename, body } of reply.documents) {
      console.log(`[document: ${filename}, ${documentSizeKb(body.length)} KB]`);
    }
  } finally {
    await app.close();
  }
}

// Exit explicitly: the context's queue connections keep the event loop
// alive after app.close(), so a finished question would otherwise hang.
main().then(() => process.exit(0), (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
