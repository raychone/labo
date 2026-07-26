import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkInput,
  CompleteStageInput,
  PaginatedWorksResponse,
  ResolveWorkQrInput,
  ResolveWorkQrResult,
  StartStageInput,
  UpdateWorkInput,
  WorkDetail,
  WorkQrView,
  WorkWorkflowExecutionView,
  WorksListParams,
  WorkTypeFormOption,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const worksQueryKeys = {
  all: ["works"] as const,
  detail: (workOrderId: string | null) => ["works", "detail", workOrderId] as const,
  list: (params: WorksListParams) => ["works", "list", params] as const,
  qr: (workOrderId: string | null) => ["works", "qr", workOrderId] as const,
  qrImage: (workOrderId: string | null) => ["works", "qr-image", workOrderId] as const,
  workflow: (workOrderId: string | null) => ["works", "workflow", workOrderId] as const,
  workTypeOptions: ["works", "work-type-options"] as const,
};

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toWorksQueryString(params: WorksListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "dateFrom", params.dateFrom);
  appendOptional(query, "dateTo", params.dateTo);
  appendOptional(query, "doctorId", params.doctorId);
  appendOptional(query, "priority", params.priority);
  appendOptional(query, "search", params.search);
  appendOptional(query, "status", params.status);
  appendOptional(query, "workTypeId", params.workTypeId);

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

export async function fetchWorks(params: WorksListParams): Promise<PaginatedWorksResponse> {
  const response = await apiFetch(`/works?${toWorksQueryString(params)}`);

  return parseApiResponse<PaginatedWorksResponse>(response);
}

export async function fetchWork(workOrderId: string): Promise<WorkDetail> {
  const response = await apiFetch(`/works/${workOrderId}`);

  return parseApiResponse<WorkDetail>(response);
}

export async function fetchWorkQr(workOrderId: string): Promise<WorkQrView> {
  const response = await apiFetch(`/works/${workOrderId}/qr`);

  return parseApiResponse<WorkQrView>(response);
}

async function responseToObjectUrl(response: Response): Promise<string> {
  if (!response.ok) {
    await parseApiResponse<never>(response);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image/png")) {
    throw new Error("Serverul nu a returnat imagine PNG.");
  }

  return URL.createObjectURL(await response.blob());
}

export async function fetchWorkQrImageObjectUrl(workOrderId: string): Promise<string> {
  const response = await apiFetch(`/works/${workOrderId}/qr-image`);

  return responseToObjectUrl(response);
}

export async function fetchWorkFormWorkTypeOptions(): Promise<readonly WorkTypeFormOption[]> {
  const response = await apiFetch("/works/work-type-options");

  return parseApiResponse<readonly WorkTypeFormOption[]>(response);
}

export async function createWork(input: CreateWorkInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>("/works", "POST", input);
}

export async function updateWork(workOrderId: string, input: UpdateWorkInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}`, "PATCH", input);
}

export async function fetchWorkWorkflow(workOrderId: string): Promise<WorkWorkflowExecutionView | null> {
  const response = await apiFetch(`/works/${workOrderId}/workflow`);

  return parseApiResponse<WorkWorkflowExecutionView | null>(response);
}

export async function startWorkflowStage(workOrderId: string, stageExecutionId: string, input: StartStageInput): Promise<WorkWorkflowExecutionView> {
  return sendJson<WorkWorkflowExecutionView>(`/works/${workOrderId}/workflow/stages/${stageExecutionId}/start`, "POST", input);
}

export async function completeWorkflowStage(workOrderId: string, stageExecutionId: string, input: CompleteStageInput): Promise<WorkWorkflowExecutionView> {
  return sendJson<WorkWorkflowExecutionView>(`/works/${workOrderId}/workflow/stages/${stageExecutionId}/complete`, "POST", input);
}

export async function resolveWorkQr(input: ResolveWorkQrInput): Promise<ResolveWorkQrResult> {
  return sendJson<ResolveWorkQrResult>("/works/resolve-qr", "POST", input);
}

export async function recordWorkQrPrint(workOrderId: string): Promise<WorkQrView> {
  return sendJson<WorkQrView>(`/works/${workOrderId}/qr/print`, "POST");
}

export function useWorks(params: WorksListParams, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchWorks(params),
    queryKey: worksQueryKeys.list(params),
    retry: false,
  });
}

export function useWork(workOrderId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null,
    queryFn: () => fetchWork(workOrderId ?? ""),
    queryKey: worksQueryKeys.detail(workOrderId),
    retry: false,
  });
}

export function useWorkQr(workOrderId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null,
    queryFn: () => fetchWorkQr(workOrderId ?? ""),
    queryKey: worksQueryKeys.qr(workOrderId),
    retry: false,
  });
}

export function useWorkQrImage(workOrderId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null,
    queryFn: () => fetchWorkQrImageObjectUrl(workOrderId ?? ""),
    queryKey: worksQueryKeys.qrImage(workOrderId),
    retry: false,
  });
}

export function useWorkWorkflow(workOrderId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null,
    queryFn: () => fetchWorkWorkflow(workOrderId ?? ""),
    queryKey: worksQueryKeys.workflow(workOrderId),
    retry: false,
  });
}

export function useWorkFormWorkTypeOptions(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: fetchWorkFormWorkTypeOptions,
    queryKey: worksQueryKeys.workTypeOptions,
    retry: false,
  });
}

export function useCreateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWork,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: worksQueryKeys.all });
    },
  });
}

export function useUpdateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: UpdateWorkInput; readonly workOrderId: string }) => updateWork(workOrderId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: worksQueryKeys.all });
    },
  });
}

export function useStartWorkflowStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, stageExecutionId, workOrderId }: { readonly input: StartStageInput; readonly stageExecutionId: string; readonly workOrderId: string }) =>
      startWorkflowStage(workOrderId, stageExecutionId, input),
    onSuccess: async (_workflow, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.workflow(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
      ]);
    },
  });
}

export function useCompleteWorkflowStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, stageExecutionId, workOrderId }: { readonly input: CompleteStageInput; readonly stageExecutionId: string; readonly workOrderId: string }) =>
      completeWorkflowStage(workOrderId, stageExecutionId, input),
    onSuccess: async (_workflow, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.workflow(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
      ]);
    },
  });
}

export function useResolveWorkQr() {
  return useMutation({
    mutationFn: resolveWorkQr,
  });
}

export function useRecordWorkQrPrint() {
  return useMutation({
    mutationFn: recordWorkQrPrint,
  });
}
