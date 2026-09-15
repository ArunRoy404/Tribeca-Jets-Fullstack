import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service.js';
import { MAIL_DRIVER, type MailDriver } from './mail.interface.js';
import { LogMailDriver } from './drivers/log.driver.js';
import { SmtpMailDriver } from './drivers/smtp.driver.js';
import { MailService } from './mail.service.js';

/**
 * Picks the mail backend once, at boot: SMTP when credentials are present,
 * otherwise the log driver so the auth flows stay testable without a mail
 * account.
 */
const mailDriverProvider: Provider = {
  provide: MAIL_DRIVER,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): MailDriver => {
    const logger = new Logger('MailModule');

    if (config.mail.driver === 'smtp') {
      const driver = new SmtpMailDriver(config);
      logger.log('Mail driver resolved: smtp');
      return driver;
    }

    // Two-factor codes and password resets would silently never arrive.
    // Better to refuse to start than to ship an account-recovery black hole.
    if (config.isProduction) {
      throw new Error(
        'No SMTP configuration found. Production requires SMTP_HOST, SMTP_USER ' +
          'and SMTP_PASSWORD, otherwise two-factor and password-reset emails ' +
          'would never be delivered.',
      );
    }

    logger.warn('Mail driver resolved: log (emails are printed, not sent)');
    return new LogMailDriver();
  },
};

@Global()
@Module({
  providers: [mailDriverProvider, MailService],
  exports: [MailService],
})
export class MailModule {}
