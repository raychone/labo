import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RealtimeSync, getRealtimeQueryPrefixes } from "./realtime-sync.js";

class FakeEventSource {
  public static instances: FakeEventSource[] = [];
  public readonly close = vi.fn();
  public readonly listeners = new Map<string, Set<EventListener>>();
  public readonly options: EventSourceInit | undefined;
  public readonly url: string;

  public constructor(url: string | URL, options?: EventSourceInit) {
    this.url = String(url);
    this.options = options;
    FakeEventSource.instances.push(this);
  }

  public addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  public removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit(type: string, data = "{}"): void {
    const event = new MessageEvent(type, { data });
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function renderSync(queryClient: QueryClient, onStatusChange?: (status: "CONNECTED" | "DISCONNECTED" | "RECONNECTED" | "RECONNECTING") => void): ReturnType<typeof render> {
  const wrapper = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return render(<RealtimeSync enabled {...(onStatusChange ? { onStatusChange } : {})} />, { wrapper });
}

describe("RealtimeSync", () => {
  afterEach(() => {
    FakeEventSource.instances = [];
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("maps topics to specific TanStack Query prefixes", () => {
    expect(getRealtimeQueryPrefixes(["clinics", "works", "clinics"])).toStrictEqual([
      ["clinics"],
      ["doctors"],
      ["works"],
    ]);
  });

  it("coalesces duplicate events and performs a reconnect catch-up", () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const view = renderSync(queryClient);
    const source = FakeEventSource.instances[0];
    expect(source?.options).toStrictEqual({ withCredentials: true });

    act(() => source?.emit("ready"));
    expect(invalidate).toHaveBeenCalledWith({ refetchType: "active" });
    invalidate.mockClear();

    const event = JSON.stringify({
      id: "event-1",
      occurredAt: "2026-09-07T10:00:00.000Z",
      topics: ["works", "status"],
      type: "WORK_CHANGED",
    });
    act(() => {
      source?.emit("domain", event);
      source?.emit("domain", event);
      vi.advanceTimersByTime(75);
    });
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["works"], refetchType: "active" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["status"], refetchType: "active" });

    invalidate.mockClear();
    act(() => source?.emit("ready"));
    expect(invalidate).toHaveBeenCalledWith({ refetchType: "active" });
    view.unmount();
    expect(source?.close).toHaveBeenCalled();
  });

  it("clears authenticated cache state when the server expires the session", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["auth", "me"], { user: { id: "user-1" } });
    renderSync(queryClient);
    const source = FakeEventSource.instances[0];

    act(() => source?.emit("session-expired"));

    expect(queryClient.getQueryData(["auth", "me"])).toBeNull();
    expect(source?.close).toHaveBeenCalled();
  });

  it("tracks disconnect and reconnect states and catches up after reconnection", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
    const onStatusChange = vi.fn();
    renderSync(queryClient, onStatusChange);
    const source = FakeEventSource.instances[0];

    act(() => source?.emit("open"));
    act(() => source?.emit("error"));
    act(() => source?.emit("open"));
    act(() => source?.emit("ready"));

    expect(onStatusChange.mock.calls.map(([state]) => state)).toEqual(["CONNECTED", "RECONNECTING", "RECONNECTED"]);
    expect(invalidate).toHaveBeenCalledWith({ refetchType: "active" });
  });

  it("keeps independent tabs consistent without sharing mutable client state", () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    const firstClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const secondClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const firstInvalidate = vi.spyOn(firstClient, "invalidateQueries").mockResolvedValue();
    const secondInvalidate = vi.spyOn(secondClient, "invalidateQueries").mockResolvedValue();
    renderSync(firstClient);
    renderSync(secondClient);
    const event = JSON.stringify({ id: "shared-event", occurredAt: "2026-09-07T10:00:00.000Z", topics: ["works"], type: "WORK_CHANGED" });

    act(() => {
      FakeEventSource.instances[0]?.emit("domain", event);
      FakeEventSource.instances[1]?.emit("domain", event);
      vi.advanceTimersByTime(75);
    });

    expect(firstInvalidate).toHaveBeenCalledWith({ queryKey: ["works"], refetchType: "active" });
    expect(secondInvalidate).toHaveBeenCalledWith({ queryKey: ["works"], refetchType: "active" });
  });
});
