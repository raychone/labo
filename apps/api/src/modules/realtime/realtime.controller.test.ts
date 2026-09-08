import { UnauthorizedException } from "@nestjs/common";
import { of } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { RealtimeController } from "./realtime.controller.js";
import type { RealtimeService } from "./realtime.service.js";

describe("RealtimeController", () => {
  it("refuses a request without authenticated session context", () => {
    const controller = new RealtimeController({ createEventStream: vi.fn() } as unknown as RealtimeService);

    expect(() => controller.events({} as AuthenticatedRequest)).toThrow(UnauthorizedException);
  });

  it("binds the stream to the authenticated user and server-side session", () => {
    const createEventStream = vi.fn().mockReturnValue(of({ data: {}, type: "ready" }));
    const controller = new RealtimeController({ createEventStream } as unknown as RealtimeService);
    const expiresAt = new Date("2026-09-07T18:00:00.000Z");

    controller.events({
      auth: {
        session: { expiresAt, id: "session-1" },
        user: { displayName: "User", email: "user@example.test", id: "user-1", mustChangePassword: false, preferredColor: null },
      },
    } as AuthenticatedRequest);

    expect(createEventStream).toHaveBeenCalledWith({ expiresAt, sessionId: "session-1", userId: "user-1" });
  });
});
