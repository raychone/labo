import { Controller, Header, Sse, UnauthorizedException, UseGuards, Req, type MessageEvent } from "@nestjs/common";
import type { Observable } from "rxjs";

import { AuthGuard } from "../auth/auth.guard.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { RealtimeService } from "./realtime.service.js";

@Controller("realtime")
@UseGuards(AuthGuard)
export class RealtimeController {
  public constructor(private readonly realtimeService: RealtimeService) {}

  @Sse("events")
  @Header("Cache-Control", "private, no-cache, no-store, no-transform")
  @Header("X-Accel-Buffering", "no")
  public events(@Req() request: AuthenticatedRequest): Observable<MessageEvent> {
    const auth = request.auth;
    if (!auth) {
      throw new UnauthorizedException("Authentication required.");
    }

    return this.realtimeService.createEventStream({
      expiresAt: auth.session.expiresAt,
      sessionId: auth.session.id,
      userId: auth.user.id,
    });
  }
}
