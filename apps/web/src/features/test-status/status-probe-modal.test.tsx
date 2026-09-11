import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StatusProbeModal } from "./status-probe-modal.js";

function json(body: unknown): Response {
  return {
    json: async () => body,
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function renderModal(onOpenChange = vi.fn()): ReturnType<typeof vi.fn> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={queryClient}><ToastProvider><StatusProbeModal isOpen onOpenChange={onOpenChange} /></ToastProvider></QueryClientProvider>);
  return onOpenChange;
}

describe("StatusProbeModal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("waits for clinic selection before requesting or listing returned probe candidates", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/permissions")) return Promise.resolve(json({ permissions: [{ key: "cycles.create_next", scopes: ["ALL"] }] }));
      if (url.endsWith("/clinics/options")) return Promise.resolve(json([{ code: "CL-1", id: "clinic_1", name: "Clinica Test" }]));
      if (url.endsWith("/works/probe-types")) return Promise.resolve(json([{ code: "METAL", id: "probe_1", name: "Metal" }]));
      if (url.includes("/doctors/options")) return Promise.resolve(json([{ clinicId: "clinic_1", displayName: "Dr. Ana", id: "doctor_1" }]));
      if (url.includes("/patients/options")) return Promise.resolve(json(Array.from({ length: 6 }, (_, index) => ({ fullName: `Pacient ${index + 1}`, id: `patient_${index + 1}` }))));
      if (url.includes("/status/operational")) return Promise.resolve(json({
        counters: [],
        items: [{
          clinic: { id: "clinic_1", name: "Clinica Test" }, components: [{ name: "Coroană zirconiu", teeth: ["11"] }],
          currentCycle: { number: 2 }, id: "work_1", patient: { id: "patient_1", name: "Maria Ionescu" },
          shade: "A2", technicalReadiness: "PROBE_READY", workCode: "WO-26-0009", workType: { name: "Coroană zirconiu" },
        }],
        meta: { hasMore: false, page: 1, pageSize: 100, scannedRows: 1, total: 1, totalPages: 1 },
      }));
      if (url.endsWith("/works/work_1")) return Promise.resolve(json({
        completedProbeCycles: [{ id: "cycle_1", probeTypeNameSnapshot: "ZR", sequence: 1 }],
        items: [],
      }));
      if (url.endsWith("/auth/csrf")) return Promise.resolve(json({ csrfToken: "csrf-token" }));
      if (url.endsWith("/works/work_1/probe-cycles/receive") && init?.method === "POST") return Promise.resolve(json({ id: "cycle_2" }));
      return Promise.resolve(json({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    const onOpenChange = renderModal();

    expect(await screen.findByText("Selectează clinica", { selector: "strong" })).toBeDefined();
    expect(screen.queryByText("WO-26-0009")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/status/operational"))).toBe(false);

    await screen.findByText("Clinica Test");
    const clinicSelect = screen.getByRole("combobox", { name: /Clinică/ });
    fireEvent.focus(clinicSelect);
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Clinica Test" }));

    await waitFor(() => expect(clinicSelect.getAttribute("value")).toBe("Clinica Test"));
    expect(await screen.findByText("Pacient 5")).toBeDefined();
    expect(screen.getByText("Pacient 6")).toBeDefined();
    expect(screen.queryByText("WO-26-0009")).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/status/operational"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Pacient 1" }));
    expect((await screen.findAllByText("WO-26-0009")).length).toBeGreaterThan(0);
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("includeProbeReturnCandidates=true") && String(url).includes("patientId=patient_1"))).toBe(true));
    expect(screen.getByText("Lucrări disponibile cu probe la curier")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Proba 2.*Coroană zirconiu.*WO-26-0009/i }));

    expect(await screen.findByText("Proba selectată")).toBeDefined();
    expect(screen.getByText("Probe efectuate anterior")).toBeDefined();
    expect(await screen.findByText("ZR")).toBeDefined();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByLabelText("Ora termenului").getAttribute("type")).toBe("time");
    expect(screen.getByRole("button", { name: "Înregistrează proba" }).hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Data termenului probei *"), { target: { value: "2026-09-12" } });
    expect(screen.getByRole("button", { name: "Înregistrează proba" }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Înregistrează proba" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/works/work_1/probe-cycles/receive"))).toBe(true));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
