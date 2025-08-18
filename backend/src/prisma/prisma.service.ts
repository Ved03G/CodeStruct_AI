import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      // eslint-disable-next-line no-console
      console.warn('Prisma: DATABASE_URL not set; skipping DB connection.');
      return;
    }
    try {
      await this.$connect();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Prisma: failed to connect to database:', e?.message || e);
    }
  }
}
