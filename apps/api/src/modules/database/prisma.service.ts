import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { loadServerEnvironment } from "../../config/environment.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public constructor() {
    const environment = loadServerEnvironment();

    super({
      adapter: new PrismaPg({
        connectionString: environment.databaseUrl,
      }),
      transactionOptions: {
        maxWait: 10_000,
        timeout: 15_000,
      },
    });
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
