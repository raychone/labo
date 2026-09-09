import { spawn } from "node:child_process";

const webUrl = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3138/login");
const configuredApiUrl = new URL(process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3137");
const apiUrl = configuredApiUrl.pathname === "/"
  ? new URL("/health", configuredApiUrl)
  : configuredApiUrl;
const webOrigin = webUrl.origin;
const apiOrigin = configuredApiUrl.origin;

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

async function waitForServer(url, timeoutMs = 180_000, intervalMs = 500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) {
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

  // Do not start the root `pnpm dev` command here. Local .env files commonly
  // define PORT for the API while Vite has its own port, which makes the two
  // processes race for one socket. Smoke runs always get their own explicit
  // ports and CORS origin instead.
  const api = spawn("pnpm", ["--filter", "@dental-lab/api", "start"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DEMO_LOGIN_ENABLED: "true",
      DEMO_MODE: "true",
      PORT: configuredApiUrl.port || "3137",
      WEB_ORIGIN: webOrigin,
    },
  });
  const children = [api];

  const shutdown = (signal) => {
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const failOnUnexpectedExit = (code, signal) => {
    if (signal) {
      process.exitCode = 1;
      return;
    }
    process.exit(code ?? 0);
  };

  api.on("exit", failOnUnexpectedExit);

  if (!(await waitForServer(apiUrl))) {
    shutdown("SIGTERM");
    throw new Error(`Playwright API did not become ready at ${apiUrl.href}`);
  }

  const web = spawn("pnpm", ["--filter", "@dental-lab/web", "exec", "vite", "--host", "127.0.0.1", "--port", webUrl.port || "3138"], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_API_BASE_URL: apiOrigin,
      VITE_DEMO_MODE: "true",
    },
  });
  children.push(web);
  web.on("exit", failOnUnexpectedExit);
}

void main();
