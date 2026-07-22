import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkTypeInput,
  PaginatedWorkTypesResponse,
  UpdateWorkTypeInput,
  WorkTypeDetail,
  WorkTypeOption,
  WorkTypesListParams,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const workTypeQueryKeys = {
  all: ["work-types"] as const,
  detail: (workTypeId: string | null) => ["work-types", "detail", workTypeId] as const,
  list: (params: WorkTypesListParams) => ["work-types", "list", params] as const,
  options: ["work-types", "options"] as const,
};

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { readonly message?: string | readonly string[] } | undefined;
    const rawMessage = body?.message;
    const message = Array.isArray(rawMessage) ? rawMessage.join(" ") : typeof rawMessage === "string" ? rawMessage : undefined;
    throw new Error(message ?? "Request-ul a esuat.");
  }

  return response.json() as Promise<TResponse>;
}

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toWorkTypesQueryString(params: WorkTypesListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  appendOptional(query, "search", params.search);
  appendOptional(query, "isActive", params.isActive);

  return query.toString();
}

async function sendJson<TResponse>(path: string, method: "PATCH" | "POST", body?: unknown): Promise<TResponse> {
  const csrfToken = await fetchCsrfToken();
  const init: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);
  return parseJsonResponse<TResponse>(response);
}

export async function fetchWorkTypes(params: WorkTypesListParams): Promise<PaginatedWorkTypesResponse> {
  const response = await fetch(`${API_BASE_URL}/work-types?${toWorkTypesQueryString(params)}`, {
    credentials: "include",
  });

  return parseJsonResponse<PaginatedWorkTypesResponse>(response);
}

export async function fetchWorkType(workTypeId: string): Promise<WorkTypeDetail> {
  const response = await fetch(`${API_BASE_URL}/work-types/${workTypeId}`, {
    credentials: "include",
  });

  return parseJsonResponse<WorkTypeDetail>(response);
}

export async function fetchWorkTypeOptions(): Promise<readonly WorkTypeOption[]> {
  const response = await fetch(`${API_BASE_URL}/work-types/options`, {
    credentials: "include",
  });

  return parseJsonResponse<readonly WorkTypeOption[]>(response);
}

export async function createWorkType(input: CreateWorkTypeInput): Promise<WorkTypeDetail> {
  return sendJson<WorkTypeDetail>("/work-types", "POST", input);
}

export async function updateWorkType(workTypeId: string, input: UpdateWorkTypeInput): Promise<WorkTypeDetail> {
  return sendJson<WorkTypeDetail>(`/work-types/${workTypeId}`, "PATCH", input);
}

export async function archiveWorkType(workTypeId: string): Promise<WorkTypeDetail> {
  return sendJson<WorkTypeDetail>(`/work-types/${workTypeId}/archive`, "POST");
}

export async function restoreWorkType(workTypeId: string): Promise<WorkTypeDetail> {
  return sendJson<WorkTypeDetail>(`/work-types/${workTypeId}/restore`, "POST");
}

export function useWorkTypes(params: WorkTypesListParams, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchWorkTypes(params),
    queryKey: workTypeQueryKeys.list(params),
  });
}

export function useWorkType(workTypeId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workTypeId !== null,
    queryFn: () => fetchWorkType(workTypeId ?? ""),
    queryKey: workTypeQueryKeys.detail(workTypeId),
  });
}

export function useWorkTypeOptions(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: fetchWorkTypeOptions,
    queryKey: workTypeQueryKeys.options,
  });
}

export function useCreateWorkType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workTypeQueryKeys.all });
    },
  });
}

export function useUpdateWorkType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workTypeId }: { readonly input: UpdateWorkTypeInput; readonly workTypeId: string }) =>
      updateWorkType(workTypeId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workTypeQueryKeys.all });
    },
  });
}

export function useArchiveWorkType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveWorkType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workTypeQueryKeys.all });
    },
  });
}

export function useRestoreWorkType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreWorkType,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workTypeQueryKeys.all });
    },
  });
}
