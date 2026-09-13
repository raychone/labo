import type { PaginatedPatientWorksResponse } from "@dental-lab/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { PatientWorksPanel } from "./patients-page.js";

const works: PaginatedPatientWorksResponse = {
  items: [{
    billing: null,
    clinic: { id: "clinic_1", name: "Clinica Test" },
    code: "WO-26-0042",
    createdAt: "2026-09-10T10:00:00.000Z",
    currentStage: "Finisare",
    doctor: { displayName: "Dr. Test", id: "doctor_1" },
    id: "work_42",
    legalEntityCode: "CDT",
    patientNameSnapshot: "Ion Pop",
    patientReference: null,
    priority: "NORMAL",
    requestedDeliveryDate: "2026-09-15T10:00:00.000Z",
    status: "IN_PROGRESS",
    toothPositionSummary: "11",
    workflowProgress: { completed: 1, total: 3 },
    workType: { id: "work_type_1", name: "Coroană zirconiu" },
  }],
  page: 1,
  pageCount: 3,
  pageSize: 20,
  total: 42,
};

describe("PatientWorksPanel", () => {
  it("opens the selected work and exposes every history page", () => {
    const onPageChange = vi.fn();
    render(<MemoryRouter><PatientWorksPanel data={works} error={null} isLoading={false} onPageChange={onPageChange} /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /WO-26-0042/ }).getAttribute("href")).toBe("/works?workId=work_42");
    expect(screen.getByText("Pagina 1 din 3")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Următor" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("does not present a failed request as an empty history", () => {
    render(<MemoryRouter><PatientWorksPanel data={undefined} error={new Error("Server indisponibil")} isLoading={false} onPageChange={vi.fn()} /></MemoryRouter>);

    expect(screen.getByText("Lucrările pacientului nu au putut fi încărcate")).toBeDefined();
    expect(screen.queryByText("Nu există lucrări.")).toBeNull();
  });
});
