import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { MultiItemWorkEditor } from "./multi-item-work-editor.js";
import { defaultWorkFormValues, WorkForm } from "./work-form.js";
import type { WorkFormValues } from "./works-page.schema.js";

function PatientHarness({ onSaveNewPatient }: { readonly onSaveNewPatient: (fullName: string) => Promise<{ readonly fullName: string; readonly id: string }> }) {
  const form = useForm<WorkFormValues>({ defaultValues: defaultWorkFormValues });
  return <WorkForm
    clinicOptions={[]}
    doctorOptions={[]}
    form={form}
    formId="patient-test-form"
    isDisabled={false}
    onClinicChange={() => undefined}
    onSaveNewPatient={onSaveNewPatient}
    onSubmit={() => undefined}
    patientOptions={[]}
    workTypeOptions={[]}
  />;
}

describe("WorkForm patient creation", () => {
  it("validates a full name locally, avoids the request, then saves and selects the corrected patient", async () => {
    const savePatient = vi.fn(async (fullName: string) => ({ fullName, id: "patient_new" }));
    render(<PatientHarness onSaveNewPatient={savePatient} />);

    fireEvent.change(screen.getByLabelText("Pacient"), { target: { value: "Andrei" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    expect(await screen.findByText("Introdu numele și prenumele pacientului.")).toBeDefined();
    expect(savePatient).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Pacient"), { target: { value: "Andrei Pop" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvează" }));

    await waitFor(() => expect(savePatient).toHaveBeenCalledWith("Andrei Pop"));
    expect((screen.getByLabelText("Pacient") as HTMLInputElement).value).toBe("Andrei Pop");
    expect(screen.queryByText("Introdu numele și prenumele pacientului.")).toBeNull();
  });
});

describe("MultiItemWorkEditor tooth summary", () => {
  it("keeps a persistent, canonically ordered FDI summary in sync with tooth toggles", () => {
    render(<MultiItemWorkEditor connections={[]} disabled={false} items={[]} onChange={() => undefined} workTypeOptions={[]} />);

    expect(screen.getByText("Niciun dinte selectat")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Dinte 21" }));
    fireEvent.click(screen.getByRole("button", { name: "Dinte 11" }));
    expect(screen.getByText("Dinți selectați: 11, 21")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Dinte 11" }));
    expect(screen.getByText("Dinți selectați: 21")).toBeDefined();
  });
});
