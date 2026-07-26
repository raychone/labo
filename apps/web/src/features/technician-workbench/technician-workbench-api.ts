import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignStageInput,
  TechnicianOption,
  TechnicianWorkbenchFilter,
  TechnicianWorkbenchResponse,
  TechnicianWorkloadItem,
  UnassignStageInput,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";
import { worksQueryKeys } from "../works/works-api.js";

export const technicianWorkbenchQueryKeys = {
  all: ["technician-workbench"] as const,
  list: (params: TechnicianWorkbenchFilter) => ["technician-workbench", "list", params] as const,
  options: ["technicians", "options"] as const,
  workload: ["technician-workload"] as const,
};

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toWorkbenchQuery(params: TechnicianWorkbenchFilter): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "priority", params.priority);
  appendOptional(query, "queue", params.queue);
  appendOptional(query, "search", params.search);
  appendOptional(query, "stageKey", params.stageKey);
  appendOptional(query, "status", params.status);
  appendOptional(query, "technicianId", params.technicianId);
  return query.toString();
}

async function sendJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const csrfToken = await fetchCsrfToken();
  const response = await apiFetch(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });

  return parseApiResponse<TResponse>(response);
}

export async function fetchTechnicianWorkbench(params: TechnicianWorkbenchFilter): Promise<TechnicianWorkbenchResponse> {
  const response = await apiFetch(`/technician/workbench?${toWorkbenchQuery(params)}`);
  return parseApiResponse<TechnicianWorkbenchResponse>(response);
}

export async function fetchTechnicianWorkload(): Promise<readonly TechnicianWorkloadItem[]> {
  const response = await apiFetch("/technician/workload");
  return parseApiResponse<readonly TechnicianWorkloadItem[]>(response);
}

export async function fetchTechnicianOptions(): Promise<readonly TechnicianOption[]> {
  const response = await apiFetch("/technicians/options");
  return parseApiResponse<readonly TechnicianOption[]>(response);
}

export async function assignWorkflowStage(workOrderId: string, stageExecutionId: string, input: AssignStageInput): Promise<unknown> {
  return sendJson(`/works/${workOrderId}/workflow/stages/${stageExecutionId}/assign`, input);
}

export async function unassignWorkflowStage(workOrderId: string, stageExecutionId: string, input: UnassignStageInput): Promise<unknown> {
  return sendJson(`/works/${workOrderId}/workflow/stages/${stageExecutionId}/unassign`, input);
}

export function useTechnicianWorkbench(params: TechnicianWorkbenchFilter, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchTechnicianWorkbench(params),
    queryKey: technicianWorkbenchQueryKeys.list(params),
    retry: false,
  });
}

export function useTechnicianWorkload(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: fetchTechnicianWorkload,
    queryKey: technicianWorkbenchQueryKeys.workload,
    retry: false,
  });
}

export function useTechnicianOptions(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: fetchTechnicianOptions,
    queryKey: technicianWorkbenchQueryKeys.options,
    retry: false,
  });
}

export function useAssignWorkflowStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, stageExecutionId, workOrderId }: { readonly input: AssignStageInput; readonly stageExecutionId: string; readonly workOrderId: string }) =>
      assignWorkflowStage(workOrderId, stageExecutionId, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: technicianWorkbenchQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: technicianWorkbenchQueryKeys.workload }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.workflow(variables.workOrderId) }),
      ]);
    },
  });
}

export function useUnassignWorkflowStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, stageExecutionId, workOrderId }: { readonly input: UnassignStageInput; readonly stageExecutionId: string; readonly workOrderId: string }) =>
      unassignWorkflowStage(workOrderId, stageExecutionId, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: technicianWorkbenchQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: technicianWorkbenchQueryKeys.workload }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.workflow(variables.workOrderId) }),
      ]);
    },
  });
}
