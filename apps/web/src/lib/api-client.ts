interface ApiBaseUrlLocation {
  readonly hostname: string;
  readonly protocol: string;
}

export function resolveApiBaseUrl(
  options: {
    readonly configuredBaseUrl?: string;
    readonly isDev?: boolean;
    readonly location?: ApiBaseUrlLocation | undefined;
  } = {},
): string {
  const configuredBaseUrl = options.configuredBaseUrl ?? import.meta.env.VITE_API_BASE_URL;
  const isDev = options.isDev ?? import.meta.env.DEV;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isDev && options.location) {
    return `${options.location.protocol}//${options.location.hostname}:3010`;
  }

  return "http://localhost:3010";
}

export const API_BASE_URL = resolveApiBaseUrl({
  location: typeof window !== "undefined" ? window.location : undefined,
});

export type ApiFieldErrors = Readonly<Record<string, readonly string[]>>;

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: ApiFieldErrors = {},
    public readonly code: string | undefined = undefined,
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

interface ApiErrorBody {
  readonly code?: string;
  readonly error?: string;
  readonly fieldErrors?: Record<string, string | readonly string[]>;
  readonly message?: string | readonly string[] | Record<string, unknown>;
}

function normalizeFieldErrors(value: ApiErrorBody["fieldErrors"]): ApiFieldErrors {
  if (value === undefined) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([fieldName, messages]) => [
      fieldName,
      Array.isArray(messages) ? messages : [messages],
    ]),
  );
}

function getMessageFromBody(body: ApiErrorBody | undefined, status: number): string {
  const rawMessage = body?.message;

  if (Array.isArray(rawMessage)) {
    return rawMessage.join(" ");
  }

  if (typeof rawMessage === "string") {
    return rawMessage;
  }

  if (typeof body?.error === "string") {
    return body.error;
  }

  return status === 401 ? "Sesiunea a expirat." : "Request-ul a eșuat.";
}

async function getResponseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => undefined) as ApiErrorBody | undefined;

  return new ApiError(
    getMessageFromBody(body, response.status),
    response.status,
    normalizeFieldErrors(body?.fieldErrors),
    body?.code,
  );
}

export async function parseApiResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    const error = await getResponseError(response);

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
