import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { AuthModule } from "../auth/auth.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { RealtimeAudienceService } from "./realtime-audience.service.js";
import { RealtimeController } from "./realtime.controller.js";
import { InMemoryRealtimeEventBroker, RealtimeEventBroker } from "./realtime-event-broker.js";
import { RealtimeMutationInterceptor } from "./realtime-mutation.interceptor.js";
import { RealtimeService } from "./realtime.service.js";

@Module({
  controllers: [RealtimeController],
  exports: [RealtimeEventBroker, RealtimeService],
  imports: [AuthModule, RbacModule],
  providers: [
    RealtimeAudienceService,
    RealtimeService,
    { provide: RealtimeEventBroker, useClass: InMemoryRealtimeEventBroker },
    { provide: APP_INTERCEPTOR, useClass: RealtimeMutationInterceptor },
  ],
})
export class RealtimeModule {}
