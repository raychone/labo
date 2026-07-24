import { DEMO_SEED_FLAG, DEMO_SEED_FLAG_VALUE } from "./demo.constants.js";

export function assertDemoSeedAllowed(environment = process.env): void {
  if (environment.NODE_ENV === "production") {
    throw new Error("Demo seed is refused when NODE_ENV=production.");
  }

  if (environment[DEMO_SEED_FLAG] !== DEMO_SEED_FLAG_VALUE) {
    throw new Error(`Demo seed requires ${DEMO_SEED_FLAG}=${DEMO_SEED_FLAG_VALUE}.`);
  }
}
