import { spawn } from "node:child_process";

const webUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000/login");
const apiUrl = new URL(process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3010/health");

async function isReachable(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForExistingServers(timeoutMs = 30_000, intervalMs = 1_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const [webReady, apiReady] = await Promise.all([isReachable(webUrl), isReachable(apiUrl)]);
    if (webReady && apiReady) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

async function main() {
  if (await waitForExistingServers()) {
    setInterval(() => {}, 60_000);
    return;
  }

  const child = spawn("pnpm", ["dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: webUrl.toString(),
    },
  });

  const shutdown = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    process.exit(code ?? 0);
  });
}

void main();
