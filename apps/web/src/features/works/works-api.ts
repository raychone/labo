import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkInput,
  CreateNextWorkCycleInput,
  ClaimWorkInput,
  ClaimWorksListParams,
  CompleteStageInput,
  FinalizeRealLabSheetInput,
  PaginatedWorksResponse,
  RealLabSheetView,
  ReassignWorkInput,
  ReleaseWorkInput,
  ResolveWorkQrInput,
  SetWorkStatusInput,
  UpdateTechnicianWorkDetailsInput,
  ResolveWorkQrResult,
  StartStageInput,
  WorkDeadlinePreview,
  WorkDeadlinePreviewInput,
  UpdateWorkInput,
  UpsertRealLabSheetInput,
  WorkAssignmentEventSummary,
  WorkDetail,
  WorkCyclesHistory,
  WorkQrView,
  WorkWorkflowExecutionView,
  WorksListParams,
  WorkTypeFormOption,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { statusQueryKeys } from "../status/status-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const worksQueryKeys = {
  all: ["works"] as const,
  detail: (workOrderId: string | null) => ["works", "detail", workOrderId] as const,
  availableForClaim: (params: ClaimWorksListParams) => ["works", "available-for-claim", params] as const,
  myClaimed: (params: ClaimWorksListParams) => ["works", "my-claimed", params] as const,
  assignmentHistory: (workOrderId: string | null) => ["works", "assignment-history", workOrderId] as const,
  list: (params: WorksListParams) => ["works", "list", params] as const,
  qr: (workOrderId: string | null) => ["works", "qr", workOrderId] as const,
  qrImage: (workOrderId: string | null) => ["works", "qr-image", workOrderId] as const,
  workflow: (workOrderId: string | null) => ["works", "workflow", workOrderId] as const,
  cycles: (workOrderId: string | null) => ["works", "cycles", workOrderId] as const,
  realLabSheet: (workOrderId: string | null, cycleId: string | null) => ["works", "real-lab-sheet", workOrderId, cycleId] as const,
  workTypeOptions: ["works", "work-type-options"] as const,
  deadlinePreview: (input: WorkDeadlinePreviewInput | null) => ["works", "deadline-preview", input] as const,
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
  appendOptional(query, "deadlineFilter", params.deadlineFilter);
  appendOptional(query, "claimStatus", params.claimStatus);
  appendOptional(query, "executionLegalEntityCode", params.executionLegalEntityCode);
  appendOptional(query, "assignedTechnicianId", params.assignedTechnicianId);
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

export async function fetchAvailableWorksForClaim(params: ClaimWorksListParams): Promise<PaginatedWorksResponse> {
  const response = await apiFetch(`/works/available-for-claim?${toWorksQueryString(params)}`);

  return parseApiResponse<PaginatedWorksResponse>(response);
}

export async function fetchMyClaimedWorks(params: ClaimWorksListParams): Promise<PaginatedWorksResponse> {
  const response = await apiFetch(`/works/my-claimed?${toWorksQueryString(params)}`);

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

export async function previewWorkDeadline(input: WorkDeadlinePreviewInput): Promise<WorkDeadlinePreview> {
  return sendJson<WorkDeadlinePreview>("/works/deadline-preview", "POST", input);
}

export async function updateWork(workOrderId: string, input: UpdateWorkInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}`, "PATCH", input);
}

export async function claimWork(workOrderId: string, input: ClaimWorkInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}/claim`, "POST", input);
}

export async function releaseWork(workOrderId: string, input: ReleaseWorkInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}/release`, "POST", input);
}

export async function reassignWork(workOrderId: string, input: ReassignWorkInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}/reassign`, "POST", input);
}

export async function setWorkStatus(workOrderId: string, input: SetWorkStatusInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}/status`, "POST", input);
}

export async function updateTechnicianWorkDetails(workOrderId: string, input: UpdateTechnicianWorkDetailsInput): Promise<WorkDetail> {
  return sendJson<WorkDetail>(`/works/${workOrderId}/technician-details`, "PATCH", input);
}

export async function uploadWorkAttachments(workOrderId: string, files: readonly File[]): Promise<WorkDetail["attachments"]> {
  const csrfToken = await fetchCsrfToken();
  const body = new FormData();
  for (const file of files) {
    body.append("attachments", file);
  }
  const response = await apiFetch(`/works/${workOrderId}/attachments`, {
    body,
    headers: { "x-csrf-token": csrfToken },
    method: "POST",
  });
  return parseApiResponse<WorkDetail["attachments"]>(response);
}

export async function downloadWorkAttachment(workOrderId: string, attachmentId: string, expectedMimeType?: string): Promise<Blob> {
  const response = await apiFetch(`/works/${workOrderId}/attachments/${attachmentId}`);
  if (!response.ok) {
    await parseApiResponse<never>(response);
  }
  const content = await response.blob();
  const contentType = response.headers.get("content-type")?.split(";", 1)[0] || expectedMimeType || "application/octet-stream";
  return new Blob([content], { type: contentType });
}

export async function fetchAssignmentHistory(workOrderId: string): Promise<readonly WorkAssignmentEventSummary[]> {
  const response = await apiFetch(`/works/${workOrderId}/assignment-history`);

  return parseApiResponse<readonly WorkAssignmentEventSummary[]>(response);
}

export async function fetchWorkWorkflow(workOrderId: string): Promise<WorkWorkflowExecutionView | null> {
  const response = await apiFetch(`/works/${workOrderId}/workflow`);

  return parseApiResponse<WorkWorkflowExecutionView | null>(response);
}

export async function fetchWorkCycles(workOrderId: string): Promise<WorkCyclesHistory> {
  const response = await apiFetch(`/works/${workOrderId}/cycles`);

  return parseApiResponse<WorkCyclesHistory>(response);
}

export async function createNextWorkCycle(workOrderId: string, input: CreateNextWorkCycleInput): Promise<WorkCyclesHistory> {
  return sendJson<WorkCyclesHistory>(`/works/${workOrderId}/cycles/next`, "POST", input);
}

export async function fetchRealLabSheet(workOrderId: string, cycleId: string): Promise<RealLabSheetView> {
  const response = await apiFetch(`/works/${workOrderId}/cycles/${cycleId}/real-lab-sheet`);

  return parseApiResponse<RealLabSheetView>(response);
}

export async function upsertRealLabSheet(workOrderId: string, cycleId: string, input: UpsertRealLabSheetInput): Promise<RealLabSheetView> {
  return sendJson<RealLabSheetView>(`/works/${workOrderId}/cycles/${cycleId}/real-lab-sheet`, "PATCH", input);
}

export async function finalizeRealLabSheet(workOrderId: string, cycleId: string, input: FinalizeRealLabSheetInput): Promise<RealLabSheetView> {
  return sendJson<RealLabSheetView>(`/works/${workOrderId}/cycles/${cycleId}/real-lab-sheet/finalize`, "POST", input);
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

export function useWorks(params: WorksListParams, enabled: boolean, poll = false) {
  return useQuery({
    enabled,
    queryFn: () => fetchWorks(params),
    queryKey: worksQueryKeys.list(params),
    placeholderData: keepPreviousData,
    ...(poll ? { refetchInterval: 10_000, refetchIntervalInBackground: false } : {}),
    retry: false,
  });
}

export function useAvailableWorksForClaim(params: ClaimWorksListParams, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchAvailableWorksForClaim(params),
    queryKey: worksQueryKeys.availableForClaim(params),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useMyClaimedWorks(params: ClaimWorksListParams, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchMyClaimedWorks(params),
    queryKey: worksQueryKeys.myClaimed(params),
    placeholderData: keepPreviousData,
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

export function useWorkCycles(workOrderId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null,
    queryFn: () => fetchWorkCycles(workOrderId ?? ""),
    queryKey: worksQueryKeys.cycles(workOrderId),
    retry: false,
  });
}

export function useRealLabSheet(workOrderId: string | null, cycleId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null && cycleId !== null,
    queryFn: () => fetchRealLabSheet(workOrderId ?? "", cycleId ?? ""),
    queryKey: worksQueryKeys.realLabSheet(workOrderId, cycleId),
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

export function useWorkDeadlinePreview(input: WorkDeadlinePreviewInput | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && input !== null,
    queryFn: () => previewWorkDeadline(input as WorkDeadlinePreviewInput),
    queryKey: worksQueryKeys.deadlinePreview(input),
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["logistics"] }),
      ]);
    },
  });
}

export function useUploadWorkAttachments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ files, workOrderId }: { readonly files: readonly File[]; readonly workOrderId: string }) => uploadWorkAttachments(workOrderId, files),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["logistics"] }),
      ]);
    },
  });
}

export function useCreateNextWorkCycle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: CreateNextWorkCycleInput; readonly workOrderId: string }) => createNextWorkCycle(workOrderId, input),
    onSuccess: async (_history, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.workflow(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.cycles(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: statusQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["logistics"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery"] }),
      ]);
    },
  });
}

export function useUpsertRealLabSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, input, workOrderId }: { readonly cycleId: string; readonly input: UpsertRealLabSheetInput; readonly workOrderId: string }) => upsertRealLabSheet(workOrderId, cycleId, input),
    onSuccess: async (_sheet, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.cycles(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.realLabSheet(variables.workOrderId, variables.cycleId) }),
        queryClient.invalidateQueries({ queryKey: statusQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["technician-workbench"] }),
      ]);
    },
  });
}

export function useFinalizeRealLabSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, input, workOrderId }: { readonly cycleId: string; readonly input: FinalizeRealLabSheetInput; readonly workOrderId: string }) => finalizeRealLabSheet(workOrderId, cycleId, input),
    onSuccess: async (_sheet, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.cycles(variables.workOrderId) }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.realLabSheet(variables.workOrderId, variables.cycleId) }),
        queryClient.invalidateQueries({ queryKey: statusQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["technician-workbench"] }),
      ]);
    },
  });
}

function invalidateClaimQueries(queryClient: ReturnType<typeof useQueryClient>, workOrderId: string): Promise<readonly unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: ["works", "available-for-claim"] }),
    queryClient.invalidateQueries({ queryKey: ["works", "my-claimed"] }),
    queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(workOrderId) }),
    queryClient.invalidateQueries({ queryKey: worksQueryKeys.assignmentHistory(workOrderId) }),
    queryClient.invalidateQueries({ queryKey: ["technician-workbench"] }),
    queryClient.invalidateQueries({ queryKey: statusQueryKeys.all }),
  ]);
}

export function useClaimWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: ClaimWorkInput; readonly workOrderId: string }) => claimWork(workOrderId, input),
    onSuccess: async (_work, variables) => {
      await invalidateClaimQueries(queryClient, variables.workOrderId);
    },
  });
}

export function useReleaseWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: ReleaseWorkInput; readonly workOrderId: string }) => releaseWork(workOrderId, input),
    onSuccess: async (_work, variables) => {
      await invalidateClaimQueries(queryClient, variables.workOrderId);
    },
  });
}

export function useReassignWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: ReassignWorkInput; readonly workOrderId: string }) => reassignWork(workOrderId, input),
    onSuccess: async (_work, variables) => {
      await invalidateClaimQueries(queryClient, variables.workOrderId);
    },
  });
}

export function useSetWorkStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: SetWorkStatusInput; readonly workOrderId: string }) => setWorkStatus(workOrderId, input),
    onSuccess: async (_work, variables) => {
      await invalidateClaimQueries(queryClient, variables.workOrderId);
    },
  });
}

export function useUpdateTechnicianWorkDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: UpdateTechnicianWorkDetailsInput; readonly workOrderId: string }) =>
      updateTechnicianWorkDetails(workOrderId, input),
    onSuccess: async (_work, variables) => {
      await invalidateClaimQueries(queryClient, variables.workOrderId);
    },
  });
}

export function useAssignmentHistory(workOrderId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && workOrderId !== null,
    queryFn: () => fetchAssignmentHistory(workOrderId ?? ""),
    queryKey: worksQueryKeys.assignmentHistory(workOrderId),
    retry: false,
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
