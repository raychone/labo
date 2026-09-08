import { isRealtimeEventEnvelope, type RealtimeTopic } from "@dental-lab/shared";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authQueryKeys } from "../app/auth-state.js";
import { API_BASE_URL, notifyUnauthorized } from "./api-client.js";

const INVALIDATION_DELAY_MS = 75;
const MAX_REMEMBERED_EVENT_IDS = 256;

export type RealtimeConnectionState = "CONNECTED" | "DISCONNECTED" | "RECONNECTED" | "RECONNECTING";

const QUERY_PREFIXES_BY_TOPIC: Readonly<Record<RealtimeTopic, readonly QueryKey[]>> = {
  audit: [["audit"]],
  auth: [["auth"]],
  billing: [["billing"]],
  clinics: [["clinics"], ["doctors"]],
  deliveries: [["deliveries"]],
  logistics: [["logistics"]],
  notifications: [["notifications"]],
  "organization-context": [["organization-context"]],
  patients: [["patients"]],
  pricing: [["pricing"]],
  settings: [["settings"]],
  status: [["status"]],
  "technician-earnings": [["technician-operations", "earnings"]],
  "technician-operations": [["technician-operations"]],
  "technician-workbench": [["technician-workbench"], ["technician-workload"], ["technicians"]],
  users: [["users"], ["rbac"]],
  "work-forms": [["work-form-templates"]],
  "work-types": [["work-types"], ["works", "work-type-options"]],
  "workflow-templates": [["workflow-templates"]],
  works: [["works"]],
};

export function getRealtimeQueryPrefixes(topics: readonly RealtimeTopic[]): readonly QueryKey[] {
  const prefixes = new Map<string, QueryKey>();
  for (const topic of topics) {
    for (const prefix of QUERY_PREFIXES_BY_TOPIC[topic]) {
      prefixes.set(JSON.stringify(prefix), prefix);
    }
  }
  return [...prefixes.values()];
}

export function RealtimeSync({
  enabled,
  onStatusChange,
}: {
  readonly enabled: boolean;
  readonly onStatusChange?: (status: RealtimeConnectionState) => void;
}): ReactNode {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    const source = new EventSource(`${API_BASE_URL}/realtime/events`, { withCredentials: true });
    const pendingPrefixes = new Map<string, QueryKey>();
    const rememberedEventIds = new Set<string>();
    let invalidationTimer: ReturnType<typeof setTimeout> | undefined;
    let hasConnected = false;
    let status: RealtimeConnectionState = "DISCONNECTED";

    const setStatus = (nextStatus: RealtimeConnectionState): void => {
      if (status === nextStatus) return;
      status = nextStatus;
      onStatusChange?.(nextStatus);
    };

    const flushInvalidations = (): void => {
      invalidationTimer = undefined;
      const prefixes = [...pendingPrefixes.values()];
      pendingPrefixes.clear();
      for (const queryKey of prefixes) {
        void queryClient.invalidateQueries({ queryKey, refetchType: "active" });
      }
    };

    const scheduleTopics = (topics: readonly RealtimeTopic[]): void => {
      for (const prefix of getRealtimeQueryPrefixes(topics)) {
        pendingPrefixes.set(JSON.stringify(prefix), prefix);
      }
      if (invalidationTimer === undefined) {
        invalidationTimer = setTimeout(flushInvalidations, INVALIDATION_DELAY_MS);
      }
    };

    const rememberEvent = (eventId: string): boolean => {
      if (rememberedEventIds.has(eventId)) return false;
      rememberedEventIds.add(eventId);
      if (rememberedEventIds.size > MAX_REMEMBERED_EVENT_IDS) {
        const oldest = rememberedEventIds.values().next().value as string | undefined;
        if (oldest) rememberedEventIds.delete(oldest);
      }
      return true;
    };

    const onDomainEvent = (rawEvent: Event): void => {
      try {
        const parsed = JSON.parse((rawEvent as MessageEvent<string>).data) as unknown;
        if (!isRealtimeEventEnvelope(parsed) || !rememberEvent(parsed.id)) return;
        scheduleTopics(parsed.topics);
      } catch (error) {
        console.warn("Evenimentul de sincronizare primit nu este valid.", error);
      }
    };

    const onReady = (): void => {
      // Closes the fetch/subscription race and catches every event missed while
      // the native EventSource was reconnecting.
      void queryClient.invalidateQueries({ refetchType: "active" });
    };

    const onOpen = (): void => {
      setStatus(hasConnected ? "RECONNECTED" : "CONNECTED");
      hasConnected = true;
    };

    const onError = (): void => {
      setStatus(hasConnected ? "RECONNECTING" : "DISCONNECTED");
    };

    const onAccessChanged = (): void => {
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.all, refetchType: "active" });
    };

    const onSessionExpired = (): void => {
      setStatus("DISCONNECTED");
      source.close();
      queryClient.setQueryData(authQueryKeys.currentUser, null);
      queryClient.removeQueries({ queryKey: authQueryKeys.permissions });
      notifyUnauthorized();
    };

    const onServiceUnavailable = (): void => {
      setStatus("RECONNECTING");
    };

    source.addEventListener("open", onOpen);
    source.addEventListener("error", onError);
    source.addEventListener("domain", onDomainEvent);
    source.addEventListener("ready", onReady);
    source.addEventListener("access-changed", onAccessChanged);
    source.addEventListener("session-expired", onSessionExpired);
    source.addEventListener("service-unavailable", onServiceUnavailable);

    return () => {
      if (invalidationTimer !== undefined) clearTimeout(invalidationTimer);
      source.removeEventListener("open", onOpen);
      source.removeEventListener("error", onError);
      source.removeEventListener("domain", onDomainEvent);
      source.removeEventListener("ready", onReady);
      source.removeEventListener("access-changed", onAccessChanged);
      source.removeEventListener("session-expired", onSessionExpired);
      source.removeEventListener("service-unavailable", onServiceUnavailable);
      source.close();
    };
  }, [enabled, onStatusChange, queryClient]);

  return null;
}
