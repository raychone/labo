import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { describeRealtimeMutation } from "./realtime-mutation-map.js";
import { RealtimeService } from "./realtime.service.js";

@Injectable()
export class RealtimeMutationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RealtimeMutationInterceptor.name);

  public constructor(private readonly realtimeService: RealtimeService) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actorUserId = request.auth?.user.id;
    const descriptor = describeRealtimeMutation({
      body: request.body as unknown,
      method: request.method,
      path: request.originalUrl,
      ...(actorUserId ? { actorUserId } : {}),
    });
    if (!descriptor) return next.handle();

    return next.handle().pipe(tap({
      next: () => {
        try {
          // `next` runs only after the controller promise resolves. Domain
          // transactions have therefore committed before this signal exists.
          this.realtimeService.publishMutation(descriptor, actorUserId ? { actorUserId } : {});
        } catch (error) {
          // Realtime is an accelerator, never the authority. A broker failure
          // must not turn an already committed mutation into a deceptive 500.
          this.logger.error("Committed mutation could not be published to realtime subscribers.", error instanceof Error ? error.stack : String(error));
        }
      },
    }));
  }
}
