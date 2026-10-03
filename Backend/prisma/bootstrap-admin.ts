import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole, UserStatus } from '../src/generated/prisma/enums.js';
import { passwordSchema } from '../src/modules/auth/dto/verification.dto.js';

/**
 * Creates the first SUPER_ADMIN on an empty production database.
 *
 * `prisma/seed.ts` is a development fixture — seven accounts sharing the
 * public password `ChangeMe123!`, plus made-up clients and enquiries — and
 * must never run against production. This writes one real account and nothing
 * else; every other user is invited from Users & Roles.
 *
 * It only ever creates. An existing email is refused rather than reset, so
 * running it twice cannot quietly overwrite a password somebody has since
 * changed. A forgotten password goes through the normal reset flow.
 *
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME
 */
const env = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

async function main(): Promise<void> {
  const email = env('ADMIN_EMAIL').toLowerCase();
  const password = passwordSchema.safeParse(process.env['ADMIN_PASSWORD'] ?? '');
  if (!password.success) {
    throw new Error(password.error.issues.map((issue) => issue.message).join('; '));
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
  });

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new Error(`${email} already exists. Nothing was changed; use "Forgot password" to recover it.`);
    }

    // Same parameters as AuthService, so the login path verifies it unchanged.
    const passwordHash = await argon2.hash(password.data, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: env('ADMIN_FIRST_NAME'),
        lastName: env('ADMIN_LAST_NAME'),
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Created SUPER_ADMIN ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
