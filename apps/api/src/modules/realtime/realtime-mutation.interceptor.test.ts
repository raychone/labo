import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { lastValueFrom, of, throwError } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { RealtimeMutationInterceptor } from "./realtime-mutation.interceptor.js";
import type { RealtimeService } from "./realtime.service.js";

function executionContext(method: string, originalUrl: string, body?: unknown): ExecutionContext {
  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => ({
        auth: { user: { id: "actor-1" } },
        body,
        method,
        originalUrl,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("RealtimeMutationInterceptor", () => {
  it("publishes only after a successful mutation result", async () => {
    const publishMutation = vi.fn();
    const interceptor = new RealtimeMutationInterceptor({ publishMutation } as unknown as RealtimeService);
    const handler = { handle: () => of({ id: "work-1" }) } as CallHandler;

    expect(publishMutation).not.toHaveBeenCalled();
    await expect(lastValueFrom(interceptor.intercept(executionContext("POST", "/works/work-1/finalize"), handler))).resolves.toStrictEqual({ id: "work-1" });
    expect(publishMutation).toHaveBeenCalledOnce();
  });

  it("publishes technician payment invalidation for the technician in the validated body", async () => {
    const publishMutation = vi.fn();
    const interceptor = new RealtimeMutationInterceptor({ publishMutation } as unknown as RealtimeService);

    await lastValueFrom(interceptor.intercept(
      executionContext("POST", "/technician-operations/payments", { amountMinor: 10_000, technicianId: "tech-1" }),
      { handle: () => of({ id: "payment-1" }) } as CallHandler,
    ));

    expect(publishMutation).toHaveBeenCalledWith(
      expect.objectContaining({ technicianSubjectUserId: "tech-1" }),
      { actorUserId: "actor-1" },
    );
  });

  it("does not publish failed mutations or successful reads", async () => {
    const publishMutation = vi.fn();
    const interceptor = new RealtimeMutationInterceptor({ publishMutation } as unknown as RealtimeService);
    const failure = new Error("transaction rolled back");

    await expect(lastValueFrom(interceptor.intercept(
      executionContext("POST", "/works/work-1/finalize"),
      { handle: () => throwError(() => failure) } as CallHandler,
    ))).rejects.toBe(failure);
    await expect(lastValueFrom(interceptor.intercept(
      executionContext("GET", "/works/work-1"),
      { handle: () => of({ id: "work-1" }) } as CallHandler,
    ))).resolves.toStrictEqual({ id: "work-1" });
    expect(publishMutation).not.toHaveBeenCalled();
  });
});
