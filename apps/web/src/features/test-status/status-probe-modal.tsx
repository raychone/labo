import { Button, ErrorState, LoadingState, Modal, TextInput, useToast } from "@dental-lab/ui";
import type { OperationalStatusRow } from "@dental-lab/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { usePatientOptions } from "../patients/patients-api.js";
import { useOperationalStatus } from "../status/status-api.js";
import { fetchPermissions } from "../auth/auth-api.js";
import { fetchProbeTypes, useReceiveProbe, useWork } from "../works/works-api.js";

function probeLabel(row: OperationalStatusRow | null): string {
  return `Proba ${Math.max(1, row?.currentCycle?.number ?? 1)}`;
}

export function StatusProbeModal({ isOpen, onOpenChange }: { readonly isOpen: boolean; readonly onOpenChange: (open: boolean) => void }): ReactNode {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [probeTypeIds, setProbeTypeIds] = useState<readonly string[]>([]);
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const permissionsQuery = useQuery({ enabled: isOpen, queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canCreate = permissionsQuery.data?.permissions.some((permission) => permission.key === "cycles.create_next" && permission.scopes.length > 0) ?? false;
  const clinicsQuery = useQuery({ enabled: isOpen && canCreate, queryFn: fetchClinicOptions, queryKey: ["clinics", "options", "status-probe"], retry: false });
  const doctorsQuery = useQuery({ enabled: isOpen && canCreate && Boolean(clinicId), queryFn: () => fetchDoctorOptions(clinicId), queryKey: ["doctors", "options", "status-probe", clinicId], retry: false });
  const patientsQuery = usePatientOptions(patientSearch, isOpen && canCreate && Boolean(clinicId), clinicId || undefined, doctorId || undefined);
  const returnedQuery = useOperationalStatus({ excludeDemo: true, page: 1, pageSize: 100, sortBy: "updatedAt", sortDirection: "desc", tab: "RETURNED" }, isOpen && canCreate);
  const completedQuery = useOperationalStatus({ excludeDemo: true, page: 1, pageSize: 100, sortBy: "updatedAt", sortDirection: "desc", tab: "COMPLETED" }, isOpen && canCreate);
  const probeTypesQuery = useQuery({ enabled: isOpen && canCreate, queryFn: () => fetchProbeTypes(), queryKey: ["works", "probe-types"], retry: false });
  const selectedWorkQuery = useWork(selectedWorkId, isOpen && selectedWorkId !== null);
  const receiveProbe = useReceiveProbe();
  const rows = useMemo(() => {
    const byId = new Map<string, OperationalStatusRow>();
    for (const row of [...(returnedQuery.data?.items ?? []), ...(completedQuery.data?.items ?? [])]) {
      if ((row.technicalReadiness === "PROBE_READY" || row.hasCompletedPickup || row.delivery.status === "PICKED_UP") && (!clinicId || row.clinic?.id === clinicId) && (!doctorId || row.doctor?.id === doctorId) && (!patientId || row.patient.id === patientId)) byId.set(row.id, row);
    }
    return Array.from(byId.values());
  }, [clinicId, completedQuery.data?.items, doctorId, patientId, returnedQuery.data?.items]);
  const selectedWork = [...(returnedQuery.data?.items ?? []), ...(completedQuery.data?.items ?? [])].find((row) => row.id === selectedWorkId) ?? null;
  const configuredCodes = selectedWorkQuery.data?.items?.flatMap((item) => item.workType?.probeTypeCodes ?? []) ?? [];
  const completedProbeHistory = selectedWorkQuery.data?.completedProbeCycles ?? [];
  const selectableProbeTypes = configuredCodes.length > 0 ? (probeTypesQuery.data ?? []).filter((type) => typeof type.code === "string" && configuredCodes.includes(type.code)) : (probeTypesQuery.data ?? []);
  const effectiveProbeTypes = selectableProbeTypes.length > 0 ? selectableProbeTypes : (probeTypesQuery.data ?? []);
  const isLoading = clinicsQuery.isLoading || returnedQuery.isLoading || completedQuery.isLoading || probeTypesQuery.isLoading;
  useEffect(() => { if (!selectedWorkId && rows.length === 1) setSelectedWorkId(rows[0]!.id); }, [rows, selectedWorkId]);
  useEffect(() => { if (probeTypeIds.length === 0 && effectiveProbeTypes.length > 0) setProbeTypeIds([effectiveProbeTypes[0]!.id]); }, [effectiveProbeTypes, probeTypeIds.length]);
  useEffect(() => { if (!isOpen) { setClinicId(""); setDoctorId(""); setPatientSearch(""); setPatientId(""); setSelectedWorkId(null); setProbeTypeIds([]); setDeadlineDate(""); setDeadlineTime(""); } }, [isOpen]);
  function close(): void { onOpenChange(false); }
  function submit(): void {
    if (!selectedWork || probeTypeIds.length === 0 || !deadlineDate) return;
    const deadlineAt = new Date(`${deadlineDate}T${deadlineTime || "23:59"}:00`).toISOString();
    receiveProbe.mutate({ input: { deadlineAt, probeTypeIds }, workOrderId: selectedWork.id }, { onError: (error) => toast.showToast({ message: error instanceof Error ? error.message : "Proba nu a putut fi înregistrată.", title: "Proba nu a fost înregistrată", variant: "error" }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["status"] }); toast.showToast({ message: "Proba a fost înregistrată.", variant: "success" }); close(); } });
  }
  return <>
    <Modal description="Selectează clinica, medicul și pacientul pentru a identifica proba revenită." isOpen={isOpen && !selectedWork} onOpenChange={(open) => { if (!open) close(); }} title="Înregistrează revenirea">
      <div className="dashboard-page__return-modal">
        <div className="dashboard-page__return-fields">
          <label>Clinică *<select className="dl-control" value={clinicId} onChange={(event) => { setClinicId(event.target.value); setDoctorId(""); setPatientId(""); setSelectedWorkId(null); }}><option value="">Selectează clinica</option>{(clinicsQuery.data ?? []).map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select></label>
          <label>Medic<select className="dl-control" disabled={!clinicId} value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setPatientId(""); setSelectedWorkId(null); }}><option value="">Toți medicii</option>{(doctorsQuery.data ?? []).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.displayName}</option>)}</select></label>
        </div>
        {clinicId ? <TextInput label="Caută pacient" placeholder="Nume și prenume" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} /> : <p className="dashboard-page__empty-note">Selectează mai întâi clinica.</p>}
        {clinicId ? <div className="dashboard-page__return-list dashboard-page__patient-list">{(patientsQuery.data ?? []).map((patient) => <button aria-pressed={patientId === patient.id} className="dashboard-page__return-item" key={patient.id} onClick={() => { setPatientId(patient.id); const matches = rows.filter((row) => row.patient.id === patient.id); setSelectedWorkId(matches.length === 1 ? matches[0]!.id : null); }} type="button"><strong>{patient.fullName}</strong></button>)}</div> : null}
        {clinicId ? <div className="dashboard-page__return-matches"><strong>Probe disponibile de la curier</strong><div className="dashboard-page__return-list">{rows.map((row) => <button className="dashboard-page__return-item" key={row.id} onClick={() => setSelectedWorkId(row.id)} type="button"><strong>{row.patient.name} · {row.workCode}</strong><span>{probeLabel(row)} · {row.components.map((component) => component.name).join(" · ")}</span><span>{row.components.flatMap((component) => component.teeth).length > 0 ? `Dinți: ${row.components.flatMap((component) => component.teeth).join(", ")}` : "Fără dinți"}</span></button>)}</div>{!isLoading && rows.length === 0 ? <p className="dashboard-page__empty-note">Nu există probe disponibile pentru selecția curentă.</p> : null}</div> : null}
        {isLoading ? <LoadingState text="Se verifică lucrările revenite" /> : null}
        {returnedQuery.isError || completedQuery.isError || clinicsQuery.isError ? <ErrorState title="Lista nu a putut fi încărcată" description="Reîncarcă pagina și încearcă din nou." /> : null}
      </div>
    </Modal>
    <Modal footer={<div className="test-status-page__probe-actions"><Button disabled={probeTypeIds.length === 0 || !deadlineDate || receiveProbe.isPending} onClick={submit} variant="primary">Înregistrează proba</Button><Button disabled={receiveProbe.isPending} onClick={close} variant="secondary">Anulează</Button></div>} isOpen={isOpen && selectedWork !== null} onOpenChange={(open) => { if (!open) close(); }} title="Înregistrează revenirea">
      {selectedWork ? <div className="dashboard-page__probe-form"><div className="dashboard-page__probe-heading"><strong>{probeLabel(selectedWork)} · {selectedWork.workCode}</strong><span>{selectedWork.patient.name}</span></div><div className="dashboard-page__probe-summary">{selectedWork.components.map((component) => <div key={`${component.symbol}-${component.name}`}><span aria-hidden="true" className="dashboard-page__probe-color" style={{ backgroundColor: component.colorHex ?? "#0f766e" }} /><strong>{component.name}</strong><span>{component.teeth.length > 0 ? `Dinți: ${component.teeth.join(", ")}` : "Lucrare pe arcadă / caz"}</span></div>)}</div><div className="dashboard-page__probe-history"><strong>Probe efectuate anterior</strong>{completedProbeHistory.length > 0 ? completedProbeHistory.map((cycle) => <div key={cycle.id}><span>{cycle.sequence === 0 ? "Proba inițială" : `Proba ${cycle.sequence}`}</span><strong>{cycle.probeTypeNameSnapshot}</strong></div>) : <span>Nu există probe efectuate anterior.</span>}</div><fieldset className="dashboard-page__probe-types"><legend>Tipuri probă</legend><div className="dashboard-page__probe-type-cards">{effectiveProbeTypes.map((type) => <label className={`dashboard-page__probe-type-card${probeTypeIds.includes(type.id) ? " dashboard-page__probe-type-card--selected" : ""}`} key={type.id}><input checked={probeTypeIds.includes(type.id)} onChange={() => setProbeTypeIds((current) => current.includes(type.id) ? current.filter((id) => id !== type.id) : [...current, type.id])} type="checkbox" /><span className="dashboard-page__probe-type-name">{type.name}</span></label>)}</div></fieldset><div className="dashboard-page__probe-schedule"><label>Data termenului probei *<input className="dl-control dashboard-page__probe-date" onChange={(event) => setDeadlineDate(event.target.value)} type="date" value={deadlineDate} /></label><label>Ora termenului<input className="dl-control dashboard-page__probe-time" onChange={(event) => setDeadlineTime(event.target.value)} type="time" value={deadlineTime} /></label></div></div> : null}
    </Modal>
  </>;
}
