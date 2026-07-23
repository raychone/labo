export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export function addUnauthorizedListener(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    listener();
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

async function getResponseMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => undefined) as { readonly message?: string | readonly string[] } | undefined;
  const rawMessage = body?.message;

  if (Array.isArray(rawMessage)) {
    return rawMessage.join(" ");
  }

  if (typeof rawMessage === "string") {
    return rawMessage;
  }

  return response.status === 401 ? "Sesiunea a expirat." : "Request-ul a esuat.";
}

export async function parseApiResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    const error = new ApiError(await getResponseMessage(response), response.status);

    if (response.status === 401) {
      notifyUnauthorized();
    }

    throw error;
  }

  return response.json() as Promise<TResponse>;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers ?? {}),
    },
  });
}
