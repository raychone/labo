export interface HealthCheckResponse {
  readonly applicationName: string;
  readonly database: "ok" | "unavailable";
  readonly status: "ok";
}
