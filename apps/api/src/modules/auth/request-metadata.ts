import type { Request } from "express";

import type { RequestMetadata } from "./auth.types.js";

export function getRequestMetadata(request: Request): RequestMetadata {
  const userAgent = request.get("user-agent")?.slice(0, 512);

  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}
