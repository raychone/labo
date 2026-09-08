export interface HealthCheckResponse {
  readonly applicationName: string;
  readonly database: "ok" | "unavailable";
  readonly status: "ok" | "unavailable";
}

export interface LivenessResponse {
  readonly applicationName: string;
  readonly status: "ok";
}
