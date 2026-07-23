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
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const workTypeQueryKeys = {
  all: ["work-types"] as const,
  detail: (workTypeId: string | null) => ["work-types", "detail", workTypeId] as const,
  list: (params: WorkTypesListParams) => ["work-types", "list", params] as const,
  options: ["work-types", "options"] as const,
};

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
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await apiFetch(path, init);
  return parseApiResponse<TResponse>(response);
}

export async function fetchWorkTypes(params: WorkTypesListParams): Promise<PaginatedWorkTypesResponse> {
  const response = await apiFetch(`/work-types?${toWorkTypesQueryString(params)}`);

  return parseApiResponse<PaginatedWorkTypesResponse>(response);
}

export async function fetchWorkType(workTypeId: string): Promise<WorkTypeDetail> {
  const response = await apiFetch(`/work-types/${workTypeId}`);

  return parseApiResponse<WorkTypeDetail>(response);
}

export async function fetchWorkTypeOptions(): Promise<readonly WorkTypeOption[]> {
  const response = await apiFetch("/work-types/options");

  return parseApiResponse<readonly WorkTypeOption[]>(response);
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
