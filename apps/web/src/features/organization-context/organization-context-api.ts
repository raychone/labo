import type { LegalEntityCode, OrganizationContextView, SelectOrganizationContextInput } from "@dental-lab/shared";

import { apiFetch, parseApiResponse } from "../../lib/api-client.js";
import { fetchCsrfToken } from "../auth/auth-api.js";

export const organizationContextQueryKeys = {
  all: ["organization-context"] as const,
};

export async function fetchOrganizationContext(): Promise<OrganizationContextView> {
  const response = await apiFetch("/organization-context");

  return parseApiResponse<OrganizationContextView>(response);
}

export async function switchOrganizationContext(code: LegalEntityCode): Promise<OrganizationContextView> {
  const csrfToken = await fetchCsrfToken();
  const input: SelectOrganizationContextInput = { code };
  const response = await apiFetch("/organization-context", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PUT",
  });

  return parseApiResponse<OrganizationContextView>(response);
}
