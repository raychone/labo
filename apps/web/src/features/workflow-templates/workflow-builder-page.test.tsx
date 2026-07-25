import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowBuilderPage } from "./workflow-builder-page.js";

function renderWithProviders(component: ReactNode): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={["/work-types/work_type_1/workflow"]}>
          <Routes>
            <Route element={component} path="/work-types/:workTypeId/workflow" />
            <Route element={<span>Catalog</span>} path="/work-types" />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function createJsonResponse(body: unknown, status = 200): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

const template = {
  activatedAt: "2026-07-26T01:00:00.000Z",
  activatedByUserId: "user_1",
  archivedAt: null,
  archivedByUserId: null,
  createdAt: "2026-07-26T00:00:00.000Z",
  createdByUserId: "user_1",
  description: "Flux standard",
  id: "workflow_template_1",
  name: "Flux coroană zirconiu",
  stageCount: 2,
  stages: [
    {
      allowedRoleCodes: ["RECEPTIE"],
      createdAt: "2026-07-26T00:00:00.000Z",
      description: null,
      estimatedDurationMinutes: 30,
      id: "stage_1",
      isFinal: false,
      isInitial: true,
      key: "receptie",
      name: "Recepție",
      sortOrder: 1,
      updatedAt: "2026-07-26T00:00:00.000Z",
    },
    {
      allowedRoleCodes: ["TEHNICIAN"],
      createdAt: "2026-07-26T00:00:00.000Z",
      description: null,
      estimatedDurationMinutes: 240,
      id: "stage_2",
      isFinal: true,
      isInitial: false,
      key: "cad",
      name: "CAD",
      sortOrder: 2,
      updatedAt: "2026-07-26T00:00:00.000Z",
    },
  ],
  status: "ACTIVE",
  updatedAt: "2026-07-26T01:00:00.000Z",
  updatedByUserId: "user_1",
  version: 1,
  workType: {
    code: "WT-0001",
    id: "work_type_1",
    isActive: true,
    name: "Coroană zirconiu",
  },
  workTypeId: "work_type_1",
};

describe("WorkflowBuilderPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders versions and workflow preview for a reader", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: [{ key: "workflow.read", scopes: ["ALL"] }] }));
      }

      if (url.endsWith("/work-types/work_type_1/workflow-templates")) {
        return Promise.resolve(createJsonResponse({
          activeTemplateId: "workflow_template_1",
          templates: [{
            activatedAt: template.activatedAt,
            archivedAt: null,
            createdAt: template.createdAt,
            description: template.description,
            id: template.id,
            name: template.name,
            stageCount: 2,
            status: template.status,
            updatedAt: template.updatedAt,
            version: template.version,
            workTypeId: template.workTypeId,
          }],
          workType: template.workType,
        }));
      }

      if (url.endsWith("/workflow-templates/workflow_template_1")) {
        return Promise.resolve(createJsonResponse(template));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorkflowBuilderPage />);

    expect(await screen.findByRole("heading", { name: "WT-0001 · Coroană zirconiu" })).toBeDefined();
    expect(await screen.findByText("v1 · Flux coroană zirconiu")).toBeDefined();
    expect((await screen.findAllByText("Recepție")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Ai acces de citire. Poți vedea versiunile și etapele, dar nu poți modifica fluxul.")).toBeDefined();
  });
});
