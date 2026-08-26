import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, parseApiResponse } from "../../lib/api-client.js";
import { fetchCsrfToken } from "../auth/auth-api.js";

export interface NotificationView {
  readonly createdAt: string;
  readonly deepLink: string;
  readonly id: string;
  readonly message: string;
  readonly readAt: string | null;
  readonly resolvedAt: string | null;
  readonly severity: string;
  readonly title: string;
  readonly type: string;
}

interface NotificationResponse {
  readonly items: readonly NotificationView[];
  readonly unreadCount: number;
}

async function fetchNotifications(): Promise<NotificationResponse> {
  return parseApiResponse<NotificationResponse>(await apiFetch("/notifications?page=1&pageSize=40"));
}

async function markNotificationRead(id: string): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, { headers: { "x-csrf-token": csrfToken }, method: "PATCH" });
}

async function markAllNotificationsRead(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await apiFetch("/notifications/read-all", { headers: { "x-csrf-token": csrfToken }, method: "POST" });
}

async function dismissNotification(id: string): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await apiFetch(`/notifications/${encodeURIComponent(id)}/dismiss`, { headers: { "x-csrf-token": csrfToken }, method: "PATCH" });
}

async function dismissAllNotifications(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await apiFetch("/notifications/dismiss-all", { headers: { "x-csrf-token": csrfToken }, method: "PATCH" });
}

export function useNotifications(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchNotifications, queryKey: ["notifications", "list"], refetchInterval: 5_000, refetchOnWindowFocus: true, retry: false });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: markNotificationRead, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); } });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: markAllNotificationsRead, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); } });
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: dismissNotification, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); } });
}

export function useDismissAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: dismissAllNotifications, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); } });
}
