import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkflowTemplateInput,
  ReplaceWorkflowStagesInput,
  UpdateWorkflowTemplateInput,
  WorkflowTemplateDetail,
  WorkflowTemplateListResponse,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const workflowTemplateQueryKeys = {
  active: (workTypeId: string | undefined) => ["workflow-templates", "active", workTypeId] as const,
  all: ["workflow-templates"] as const,
  detail: (templateId: string | null) => ["workflow-templates", "detail", templateId] as const,
  list: (workTypeId: string | undefined) => ["workflow-templates", "list", workTypeId] as const,
};

async function sendJson<TResponse>(path: string, method: "PATCH" | "POST" | "PUT", body?: unknown): Promise<TResponse> {
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

export async function fetchWorkflowTemplates(workTypeId: string): Promise<WorkflowTemplateListResponse> {
  const response = await apiFetch(`/work-types/${workTypeId}/workflow-templates`);
  return parseApiResponse<WorkflowTemplateListResponse>(response);
}

export async function fetchWorkflowTemplate(templateId: string): Promise<WorkflowTemplateDetail> {
  const response = await apiFetch(`/workflow-templates/${templateId}`);
  return parseApiResponse<WorkflowTemplateDetail>(response);
}

export async function fetchActiveWorkflowTemplate(workTypeId: string): Promise<WorkflowTemplateDetail | null> {
  const response = await apiFetch(`/work-types/${workTypeId}/workflow-template`);
  return parseApiResponse<WorkflowTemplateDetail | null>(response);
}

export async function createWorkflowTemplate(workTypeId: string, input: CreateWorkflowTemplateInput): Promise<WorkflowTemplateDetail> {
  return sendJson<WorkflowTemplateDetail>(`/work-types/${workTypeId}/workflow-templates`, "POST", input);
}

export async function updateWorkflowTemplate(templateId: string, input: UpdateWorkflowTemplateInput): Promise<WorkflowTemplateDetail> {
  return sendJson<WorkflowTemplateDetail>(`/workflow-templates/${templateId}`, "PATCH", input);
}

export async function replaceWorkflowStages(templateId: string, input: ReplaceWorkflowStagesInput): Promise<WorkflowTemplateDetail> {
  return sendJson<WorkflowTemplateDetail>(`/workflow-templates/${templateId}/stages`, "PUT", input);
}

export async function activateWorkflowTemplate(templateId: string): Promise<WorkflowTemplateDetail> {
  return sendJson<WorkflowTemplateDetail>(`/workflow-templates/${templateId}/activate`, "POST");
}

export async function archiveWorkflowTemplate(templateId: string): Promise<WorkflowTemplateDetail> {
  return sendJson<WorkflowTemplateDetail>(`/workflow-templates/${templateId}/archive`, "POST");
}

export async function cloneWorkflowTemplate(templateId: string): Promise<WorkflowTemplateDetail> {
  return sendJson<WorkflowTemplateDetail>(`/workflow-templates/${templateId}/clone`, "POST");
}

export function useWorkflowTemplates(workTypeId: string | undefined, enabled: boolean) {
  return useQuery({
    enabled: enabled && workTypeId !== undefined,
    queryFn: () => fetchWorkflowTemplates(workTypeId ?? ""),
    queryKey: workflowTemplateQueryKeys.list(workTypeId),
  });
}

export function useWorkflowTemplate(templateId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && templateId !== null,
    queryFn: () => fetchWorkflowTemplate(templateId ?? ""),
    queryKey: workflowTemplateQueryKeys.detail(templateId),
  });
}

export function useActiveWorkflowTemplate(workTypeId: string | undefined, enabled: boolean) {
  return useQuery({
    enabled: enabled && workTypeId !== undefined && workTypeId !== "",
    queryFn: () => fetchActiveWorkflowTemplate(workTypeId ?? ""),
    queryKey: workflowTemplateQueryKeys.active(workTypeId),
    retry: false,
  });
}

function useInvalidateWorkflowTemplates() {
  const queryClient = useQueryClient();
  return async () => queryClient.invalidateQueries({ queryKey: workflowTemplateQueryKeys.all });
}

export function useCreateWorkflowTemplate() {
  const invalidate = useInvalidateWorkflowTemplates();
  return useMutation({
    mutationFn: ({ input, workTypeId }: { readonly input: CreateWorkflowTemplateInput; readonly workTypeId: string }) =>
      createWorkflowTemplate(workTypeId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateWorkflowTemplate() {
  const invalidate = useInvalidateWorkflowTemplates();
  return useMutation({
    mutationFn: ({ input, templateId }: { readonly input: UpdateWorkflowTemplateInput; readonly templateId: string }) =>
      updateWorkflowTemplate(templateId, input),
    onSuccess: invalidate,
  });
}

export function useReplaceWorkflowStages() {
  const invalidate = useInvalidateWorkflowTemplates();
  return useMutation({
    mutationFn: ({ input, templateId }: { readonly input: ReplaceWorkflowStagesInput; readonly templateId: string }) =>
      replaceWorkflowStages(templateId, input),
    onSuccess: invalidate,
  });
}

export function useActivateWorkflowTemplate() {
  const invalidate = useInvalidateWorkflowTemplates();
  return useMutation({
    mutationFn: activateWorkflowTemplate,
    onSuccess: invalidate,
  });
}

export function useArchiveWorkflowTemplate() {
  const invalidate = useInvalidateWorkflowTemplates();
  return useMutation({
    mutationFn: archiveWorkflowTemplate,
    onSuccess: invalidate,
  });
}

export function useCloneWorkflowTemplate() {
  const invalidate = useInvalidateWorkflowTemplates();
  return useMutation({
    mutationFn: cloneWorkflowTemplate,
    onSuccess: invalidate,
  });
}
