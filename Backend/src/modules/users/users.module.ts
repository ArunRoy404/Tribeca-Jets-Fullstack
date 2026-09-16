import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * Prisma, Audit and Mail are @Global, so only this module's own providers are
 * listed. UsersService is exported because other modules resolve staff through
 * it rather than querying the users table directly.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
