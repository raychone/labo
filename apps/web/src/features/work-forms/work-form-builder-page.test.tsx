import { ToastProvider } from "@dental-lab/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkFormBuilderPage } from "./work-form-builder-page.js";

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
        <MemoryRouter initialEntries={["/work-types/work_type_1/form"]}>
          <Routes>
            <Route element={component} path="/work-types/:workTypeId/form" />
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
  activatedAt: "2026-07-24T20:00:00.000Z",
  activatedByUserId: "user_1",
  archivedAt: null,
  archivedByUserId: null,
  createdAt: "2026-07-24T19:00:00.000Z",
  createdByUserId: "user_1",
  description: "Formular pentru coroane",
  fieldCount: 2,
  fields: [
    {
      defaultValue: null,
      helpText: "Alege nuanta finala",
      id: "field_1",
      isActive: true,
      key: "shade",
      label: "Nuanta",
      options: [{ label: "A1", value: "a1" }],
      placeholder: null,
      required: true,
      sortOrder: 1,
      type: "SELECT",
      validation: {},
    },
    {
      defaultValue: null,
      helpText: null,
      id: "field_2",
      isActive: true,
      key: "notes",
      label: "Observatii",
      options: [],
      placeholder: "Detalii clinice",
      required: false,
      sortOrder: 2,
      type: "TEXTAREA",
      validation: { maxLength: 500 },
    },
  ],
  id: "template_1",
  name: "Coroana zirconiu",
  status: "ACTIVE",
  updatedAt: "2026-07-24T20:00:00.000Z",
  updatedByUserId: "user_1",
  version: 1,
  workType: {
    code: "WT-0001",
    id: "work_type_1",
    isActive: true,
    name: "Coroana zirconiu",
  },
  workTypeId: "work_type_1",
};

describe("WorkFormBuilderPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders versions and live preview for a reader", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/auth/permissions")) {
        return Promise.resolve(createJsonResponse({ permissions: [{ key: "forms.read", scopes: ["ALL"] }] }));
      }

      if (url.endsWith("/work-types/work_type_1/form-templates")) {
        return Promise.resolve(createJsonResponse({
          activeTemplateId: "template_1",
          templates: [{
            activatedAt: template.activatedAt,
            archivedAt: null,
            createdAt: template.createdAt,
            description: template.description,
            fieldCount: 2,
            id: template.id,
            name: template.name,
            status: template.status,
            updatedAt: template.updatedAt,
            version: template.version,
            workTypeId: template.workTypeId,
          }],
          workType: template.workType,
        }));
      }

      if (url.endsWith("/work-form-templates/template_1")) {
        return Promise.resolve(createJsonResponse(template));
      }

      return Promise.resolve(createJsonResponse({}, 404));
    }));

    renderWithProviders(<WorkFormBuilderPage />);

    expect(await screen.findByRole("heading", { name: "WT-0001 · Coroana zirconiu" })).toBeDefined();
    expect(await screen.findByText("v1 · Coroana zirconiu")).toBeDefined();
    expect(await screen.findByLabelText("Nuanta *")).toBeDefined();
    expect(await screen.findByText("Ai acces de citire. Poți vedea versiunile și preview-ul, dar nu poți modifica formularul.")).toBeDefined();
  });
});
