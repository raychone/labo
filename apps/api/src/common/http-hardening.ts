import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { AuthenticatedRequest } from "../modules/auth/auth.types.js";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;

interface RequestLogger {
  log(message: string): void;
  warn(message: string): void;
}

export interface SafeRequestLog {
  readonly actorUserId?: string;
  readonly durationMs: number;
  readonly method: string;
  readonly path: string;
  readonly requestId: string;
  readonly statusCode: number;
}

export function resolveRequestId(value: string | undefined): string {
  const candidate = value?.trim();
  return candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
}

export function createRequestContextMiddleware(logger: RequestLogger): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(request.get(REQUEST_ID_HEADER));
    const startedAt = process.hrtime.bigint();
    let logged = false;

    response.locals["requestId"] = requestId;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.setHeader(REQUEST_ID_HEADER, requestId);

    const writeLog = (completed: boolean): void => {
      if (logged) return;
      logged = true;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const actorUserId = (request as AuthenticatedRequest).auth?.user.id;
      const entry: SafeRequestLog = {
        ...(actorUserId ? { actorUserId } : {}),
        durationMs: Math.round(durationMs * 10) / 10,
        method: request.method,
        path: request.path.slice(0, 512),
        requestId,
        statusCode: completed ? response.statusCode : 499,
      };
      const serialized = JSON.stringify(entry);
      if (completed && response.statusCode < 500) logger.log(serialized);
      else logger.warn(serialized);
    };

    response.once("finish", () => writeLog(true));
    response.once("close", () => writeLog(response.writableFinished));
    next();
  };
}
