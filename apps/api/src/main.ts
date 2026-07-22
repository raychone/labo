import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { loadServerEnvironment } from "./config/environment.js";
import { AppModule } from "./modules/app.module.js";

async function bootstrap(): Promise<void> {
  const environment = loadServerEnvironment();
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    allowedHeaders: ["Content-Type", environment.csrfHeaderName],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin: environment.webOrigin,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(environment.port);
}

void bootstrap();
