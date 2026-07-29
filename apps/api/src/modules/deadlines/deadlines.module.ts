import { Module } from "@nestjs/common";

import { BusinessCalendarService } from "./business-calendar.service.js";
import { DeadlineEngineService } from "./deadline-engine.service.js";

@Module({
  exports: [BusinessCalendarService, DeadlineEngineService],
  providers: [BusinessCalendarService, DeadlineEngineService],
})
export class DeadlinesModule {}
