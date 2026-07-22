import { NestFactory } from "@nestjs/core";

import { loadServerEnvironment } from "./config/environment.js";
import { AppModule } from "./modules/app.module.js";

async function bootstrap(): Promise<void> {
  const environment = loadServerEnvironment();
  const app = await NestFactory.create(AppModule);

  await app.listen(environment.port);
}

void bootstrap();
