import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service.js";

export type DatabaseHealthStatus = "ok" | "unavailable";

export interface DatabaseQueryClient {
  readonly $queryRaw: (query: TemplateStringsArray) => Promise<unknown>;
}

@Injectable()
export class DatabaseHealthService {
  public constructor(@Inject(PrismaService) private readonly databaseClient: PrismaService) {}

  public async getStatus(): Promise<DatabaseHealthStatus> {
    try {
      await this.databaseClient.$queryRaw(Prisma.sql`SELECT 1`);

      return "ok";
    } catch {
      return "unavailable";
    }
  }
}
