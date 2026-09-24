import { DiscoveryModule } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { AppConfigModule } from './config/config.module.js';
import { PrismaModule } from './core/prisma/prisma.module.js';
import { RedisModule } from './core/redis/redis.module.js';
import { StorageModule } from './core/storage/storage.module.js';
import { AuditModule } from './core/audit/audit.module.js';
import { MailModule } from './core/mail/mail.module.js';

import { AuthModule } from './modules/auth/auth.module.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { AirportsModule } from './modules/airports/airports.module.js';
import { OperatorsModule } from './modules/operators/operators.module.js';
import { AircraftModule } from './modules/aircraft/aircraft.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { TripRequestsModule } from './modules/trip-requests/trip-requests.module.js';
import { OperatorQuotesModule } from './modules/operator-quotes/operator-quotes.module.js';
import { QuotesModule } from './modules/quotes/quotes.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

@Module({
  imports: [
    // Lets the OpenAPI document read the same @Public/@RequirePermissions
    // metadata the guards read, so the documented 401s and 403s cannot drift
    // from what is actually enforced. See common/openapi/describe-responses.ts.
    DiscoveryModule,
    // Config first: every other module reads validated env from it.
    AppConfigModule,

    // Infrastructure (all @Global).
    PrismaModule,
    RedisModule,
    StorageModule,
    AuditModule,
    MailModule,

    // Feature modules — one per domain, added as each is built.
    HealthModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    AirportsModule,
    OperatorsModule,
    AircraftModule,
    UploadsModule,
    TripRequestsModule,
    OperatorQuotesModule,
    QuotesModule,
    NotesModule,
  ],
  providers: [
    /**
     * Guard order matters and is the security posture of the whole API:
     *   1. JwtAuthGuard   — authenticated by default; opt out with @Public()
     *   2. CsrfGuard      — cookie sessions need CSRF protection on writes
     *   3. RolesGuard        — coarse role checks from @Roles()
     *   4. PermissionsGuard  — capability checks from @RequirePermissions()
     *   5. RateLimitGuard    — per-route limits from @RateLimit()
     *
     * Neither RolesGuard nor PermissionsGuard does row-level filtering; that
     * belongs in the service layer, which calls scopeFor() and narrows its
     * own `where` clause. See common/authorization/permissions.ts.
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },

    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
