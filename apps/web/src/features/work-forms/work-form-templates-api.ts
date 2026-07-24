import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkFormTemplateInput,
  ReplaceWorkFormFieldsInput,
  UpdateWorkFormTemplateInput,
  WorkFormTemplateDetail,
  WorkFormTemplateListResponse,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const workFormTemplateQueryKeys = {
  all: ["work-form-templates"] as const,
  active: (workTypeId: string | undefined) => ["work-form-templates", "active", workTypeId] as const,
  detail: (templateId: string | null) => ["work-form-templates", "detail", templateId] as const,
  list: (workTypeId: string | undefined) => ["work-form-templates", "list", workTypeId] as const,
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

export async function fetchWorkFormTemplates(workTypeId: string): Promise<WorkFormTemplateListResponse> {
  const response = await apiFetch(`/work-types/${workTypeId}/form-templates`);
  return parseApiResponse<WorkFormTemplateListResponse>(response);
}

export async function fetchWorkFormTemplate(templateId: string): Promise<WorkFormTemplateDetail> {
  const response = await apiFetch(`/work-form-templates/${templateId}`);
  return parseApiResponse<WorkFormTemplateDetail>(response);
}

export async function createWorkFormTemplate(workTypeId: string, input: CreateWorkFormTemplateInput): Promise<WorkFormTemplateDetail> {
  return sendJson<WorkFormTemplateDetail>(`/work-types/${workTypeId}/form-templates`, "POST", input);
}

export async function updateWorkFormTemplate(templateId: string, input: UpdateWorkFormTemplateInput): Promise<WorkFormTemplateDetail> {
  return sendJson<WorkFormTemplateDetail>(`/work-form-templates/${templateId}`, "PATCH", input);
}

export async function replaceWorkFormFields(templateId: string, input: ReplaceWorkFormFieldsInput): Promise<WorkFormTemplateDetail> {
  return sendJson<WorkFormTemplateDetail>(`/work-form-templates/${templateId}/fields`, "PUT", input);
}

export async function activateWorkFormTemplate(templateId: string): Promise<WorkFormTemplateDetail> {
  return sendJson<WorkFormTemplateDetail>(`/work-form-templates/${templateId}/activate`, "POST");
}

export async function archiveWorkFormTemplate(templateId: string): Promise<WorkFormTemplateDetail> {
  return sendJson<WorkFormTemplateDetail>(`/work-form-templates/${templateId}/archive`, "POST");
}

export async function cloneWorkFormTemplate(templateId: string): Promise<WorkFormTemplateDetail> {
  return sendJson<WorkFormTemplateDetail>(`/work-form-templates/${templateId}/clone`, "POST");
}

export function useWorkFormTemplates(workTypeId: string | undefined, enabled: boolean) {
  return useQuery({
    enabled: enabled && workTypeId !== undefined,
    queryFn: () => fetchWorkFormTemplates(workTypeId ?? ""),
    queryKey: workFormTemplateQueryKeys.list(workTypeId),
  });
}

export function useWorkFormTemplate(templateId: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && templateId !== null,
    queryFn: () => fetchWorkFormTemplate(templateId ?? ""),
    queryKey: workFormTemplateQueryKeys.detail(templateId),
  });
}

function useInvalidateWorkFormTemplates() {
  const queryClient = useQueryClient();
  return async () => queryClient.invalidateQueries({ queryKey: workFormTemplateQueryKeys.all });
}

export function useCreateWorkFormTemplate() {
  const invalidate = useInvalidateWorkFormTemplates();
  return useMutation({
    mutationFn: ({ input, workTypeId }: { readonly input: CreateWorkFormTemplateInput; readonly workTypeId: string }) =>
      createWorkFormTemplate(workTypeId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateWorkFormTemplate() {
  const invalidate = useInvalidateWorkFormTemplates();
  return useMutation({
    mutationFn: ({ input, templateId }: { readonly input: UpdateWorkFormTemplateInput; readonly templateId: string }) =>
      updateWorkFormTemplate(templateId, input),
    onSuccess: invalidate,
  });
}

export function useReplaceWorkFormFields() {
  const invalidate = useInvalidateWorkFormTemplates();
  return useMutation({
    mutationFn: ({ input, templateId }: { readonly input: ReplaceWorkFormFieldsInput; readonly templateId: string }) =>
      replaceWorkFormFields(templateId, input),
    onSuccess: invalidate,
  });
}

export function useActivateWorkFormTemplate() {
  const invalidate = useInvalidateWorkFormTemplates();
  return useMutation({
    mutationFn: activateWorkFormTemplate,
    onSuccess: invalidate,
  });
}

export function useArchiveWorkFormTemplate() {
  const invalidate = useInvalidateWorkFormTemplates();
  return useMutation({
    mutationFn: archiveWorkFormTemplate,
    onSuccess: invalidate,
  });
}

export function useCloneWorkFormTemplate() {
  const invalidate = useInvalidateWorkFormTemplates();
  return useMutation({
    mutationFn: cloneWorkFormTemplate,
    onSuccess: invalidate,
  });
}
