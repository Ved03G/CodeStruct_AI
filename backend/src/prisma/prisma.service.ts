import { Injectable, OnModuleInit } from '@nestjs/common';
// Use runtime require to avoid editor TS errors when prisma client isn't generated locally
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client');

@Injectable()
export class PrismaService extends (PrismaClient as any) implements OnModuleInit {
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.warn('Prisma: DATABASE_URL not set; skipping DB connection.');
      return;
    }
    try {
  await (this as any).$connect();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Prisma: failed to connect to database:', e?.message || e);
    }
  }
}
