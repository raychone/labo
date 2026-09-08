import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { Server } from "node:http";

import { createRequestContextMiddleware, REQUEST_ID_HEADER } from "./common/http-hardening.js";
import { loadServerEnvironment } from "./config/environment.js";
import { AppModule } from "./modules/app.module.js";

async function bootstrap(): Promise<void> {
  const environment = loadServerEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const requestLogger = new Logger("HttpRequest");

  app.disable("x-powered-by");
  app.set("trust proxy", environment.trustProxyHops > 0 ? environment.trustProxyHops : false);
  app.use(helmet());
  app.use(cookieParser());
  app.use(createRequestContextMiddleware(requestLogger));
  app.enableCors({
    allowedHeaders: ["Content-Type", environment.csrfHeaderName, REQUEST_ID_HEADER],
    credentials: true,
    exposedHeaders: [REQUEST_ID_HEADER],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin: [...environment.webOrigins],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(environment.port);
  const server = app.getHttpServer() as Server;
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

const bootstrapLogger = new Logger("Bootstrap");

void bootstrap().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  bootstrapLogger.error(`API startup failed (${errorName}).`);
  process.exitCode = 1;
});
