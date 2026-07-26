import { useMutation } from "@tanstack/react-query";
import type { ResolveScanInput, ScanContextView } from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export async function resolveOperationalScan(input: ResolveScanInput): Promise<ScanContextView> {
  const response = await apiFetch("/scan/resolve", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseApiResponse<ScanContextView>(response);
}

export async function recordScanWorkOpened(workId: string): Promise<{ readonly ok: true }> {
  const csrfToken = await fetchCsrfToken();
  const response = await apiFetch("/scan/work-opened", {
    body: JSON.stringify({ workId }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });

  return parseApiResponse<{ readonly ok: true }>(response);
}

export function useResolveOperationalScan() {
  return useMutation({
    mutationFn: resolveOperationalScan,
  });
}

export function useRecordScanWorkOpened() {
  return useMutation({
    mutationFn: recordScanWorkOpened,
  });
}
