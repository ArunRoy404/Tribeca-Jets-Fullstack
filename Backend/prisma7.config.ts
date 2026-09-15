import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // A directory, not a file: models are split per domain under prisma/schema/.
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
