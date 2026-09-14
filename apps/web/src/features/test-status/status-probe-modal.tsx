import { Button, ErrorState, LoadingState, Modal, Select, TextInput, useToast } from "@dental-lab/ui";
import type { OperationalStatusRow } from "@dental-lab/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { usePatientOptions } from "../patients/patients-api.js";
import { useOperationalStatus } from "../status/status-api.js";
import { useProbeTypes, useReceiveProbe, useWork } from "../works/works-api.js";

function probeLabel(row: OperationalStatusRow): string { return `Proba ${Math.max(1, row.currentCycle?.number ?? 1)}`; }
function workLabel(row: OperationalStatusRow): string { return row.components.length > 0 ? row.components.map((component) => component.name).join(" · ") : row.workType.name; }
function teethLabel(row: OperationalStatusRow): string { const teeth = row.components.flatMap((component) => component.teeth); return teeth.length > 0 ? teeth.join(", ") : "—"; }

/** Single progressive modal for receiving a probe after the courier pickup. */
export function StatusProbeModal({ isOpen, onOpenChange }: { readonly isOpen: boolean; readonly onOpenChange: (open: boolean) => void }): ReactNode {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [clinicId, setClinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [selectedWorkIds, setSelectedWorkIds] = useState<readonly string[]>([]);
  const [probeTypeSelections, setProbeTypeSelections] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const permissionsQuery = useQuery({ enabled: isOpen, queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canCreate = permissionsQuery.data?.permissions.some((permission) => permission.key === "cycles.create_next" && permission.scopes.length > 0) ?? false;
  const clinicsQuery = useQuery({ enabled: isOpen && canCreate, queryFn: fetchClinicOptions, queryKey: ["clinics", "options", "status-probe"], retry: false });
  const doctorsQuery = useQuery({ enabled: isOpen && canCreate && Boolean(clinicId), queryFn: () => fetchDoctorOptions(clinicId), queryKey: ["doctors", "options", "status-probe", clinicId], retry: false });
  const patientsQuery = usePatientOptions(patientSearch, isOpen && canCreate && Boolean(clinicId), clinicId || undefined, doctorId || undefined);
  const candidatesQuery = useOperationalStatus({ clinicId: clinicId || null, doctorId: doctorId || null, excludeDemo: true, includeProbeReturnCandidates: true, page: 1, pageSize: 100, patientId: patientId || null, sortBy: "updatedAt", sortDirection: "desc", tab: "ALL" }, isOpen && canCreate && Boolean(clinicId) && Boolean(patientId));
  const probeTypesQuery = useProbeTypes(isOpen && canCreate);
  const selectedWorkQuery = useWork(selectedWorkId, isOpen && selectedWorkId !== null);
  const receiveProbe = useReceiveProbe();
  const candidateRows = useMemo(() => (candidatesQuery.data?.items ?? []).filter((row) => row.technicalReadiness === "PROBE_READY" && row.hasCompletedPickup && (!clinicId || row.clinic?.id === clinicId) && (!doctorId || row.doctor?.id === doctorId)), [candidatesQuery.data?.items, clinicId, doctorId]);
  const patientCandidateRows = useMemo(() => patientId ? candidateRows.filter((row) => row.patient.id === patientId) : [], [candidateRows, patientId]);
  const selectedWork = patientCandidateRows.find((row) => row.id === selectedWorkId) ?? null;
  const probeTypeIds = selectedWorkId ? probeTypeSelections[selectedWorkId] ?? [] : [];
  const selectedPatient = (patientsQuery.data ?? []).find((patient) => patient.id === patientId) ?? null;
  const configuredCodes = selectedWorkQuery.data?.items?.flatMap((item) => item.workType?.probeTypeCodes ?? []) ?? [];
  const completedProbeHistory = selectedWorkQuery.data?.completedProbeCycles ?? [];
  const matchingProbeTypes = configuredCodes.length > 0 ? (probeTypesQuery.data ?? []).filter((type) => typeof type.code === "string" && configuredCodes.includes(type.code)) : (probeTypesQuery.data ?? []);
  const selectableProbeTypes = matchingProbeTypes.length > 0 ? matchingProbeTypes : (probeTypesQuery.data ?? []);
  const isLoading = clinicsQuery.isLoading || candidatesQuery.isLoading || probeTypesQuery.isLoading;

  useEffect(() => {
    setSelectedWorkIds((current) => current.filter((id) => patientCandidateRows.some((row) => row.id === id)));
    if (selectedWorkId && !patientCandidateRows.some((row) => row.id === selectedWorkId)) setSelectedWorkId(null);
  }, [patientCandidateRows, selectedWorkId]);
  function close(): void {
    onOpenChange(false); setClinicId(""); setDoctorId(""); setPatientSearch(""); setPatientId(""); setSelectedWorkId(null); setSelectedWorkIds([]); setProbeTypeSelections({}); setDeadlineDate(""); setDeadlineTime("");
  }
  function toggleWork(workOrderId: string): void {
    setSelectedWorkIds((current) => {
      const next = current.includes(workOrderId) ? current.filter((id) => id !== workOrderId) : [...current, workOrderId];
      setSelectedWorkId(next.includes(workOrderId) ? workOrderId : next[0] ?? null);
      return next;
    });
  }
  function toggleProbeType(typeId: string): void {
    if (!selectedWorkId) return;
    setProbeTypeSelections((current) => {
      const currentIds = current[selectedWorkId] ?? [];
      return { ...current, [selectedWorkId]: currentIds.includes(typeId) ? currentIds.filter((id) => id !== typeId) : [...currentIds, typeId] };
    });
  }
  async function submit(): Promise<void> {
    if (!selectedWork || selectedWorkIds.length === 0 || !deadlineDate || selectedWorkIds.some((id) => (probeTypeSelections[id] ?? []).length === 0)) return;
    const deadlineAt = new Date(`${deadlineDate}T${deadlineTime || "23:59"}:00`).toISOString();
    try {
      for (const workOrderId of selectedWorkIds) {
        const nextProbeTypeIds = probeTypeSelections[workOrderId] ?? [];
        await receiveProbe.mutateAsync({ input: { deadlineAt, probeTypeIds: nextProbeTypeIds }, workOrderId });
      }
      await queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.showToast({ message: selectedWorkIds.length === 1 ? "Proba a fost înregistrată." : `${selectedWorkIds.length} probe au fost înregistrate.`, variant: "success" });
      close();
    } catch (error) {
      toast.showToast({ message: error instanceof Error ? error.message : "Una dintre probe nu a putut fi înregistrată.", title: "Probele nu au fost înregistrate complet", variant: "error" });
    }
  }

  const hasSelectedWork = selectedWork !== null && selectedWorkIds.length > 0;
  const allSelectedConfigured = selectedWorkIds.length > 0 && selectedWorkIds.every((id) => (probeTypeSelections[id] ?? []).length > 0);
  return <Modal className="dashboard-page__returned-probe-modal" description="Selectează probele revenite și stabilește manual tipurile pentru fiecare lucrare." footer={<div className="dashboard-page__return-actions"><Button disabled={receiveProbe.isPending} onClick={close} type="button" variant="secondary">Anulează</Button><Button disabled={!hasSelectedWork || !allSelectedConfigured || !deadlineDate} isLoading={receiveProbe.isPending} onClick={() => void submit()} type="button">{selectedWorkIds.length > 1 ? `Înregistrează ${selectedWorkIds.length} probe` : "Înregistrează proba"}</Button></div>} isOpen={isOpen} onOpenChange={(open) => { if (!open) close(); }} size="xl" title="Înregistrează probele revenite">
    <div className="dashboard-page__unified-return-modal">
      <p className="dashboard-page__return-progress" aria-label="Etape"><span className={!hasSelectedWork ? "is-active" : "is-complete"}>1. Identifică lucrarea</span><span className={hasSelectedWork ? "is-active" : ""}>2. Înregistrează revenirea</span></p>
      <section className="dashboard-page__return-panel" aria-labelledby="status-probe-identify-title">
        <h3 id="status-probe-identify-title">1. Identifică lucrarea</h3>
        <div className="dashboard-page__return-fields"><Select label="Clinică" onChange={(event) => { setClinicId(event.target.value); setDoctorId(""); setPatientId(""); setSelectedWorkId(null); setPatientSearch(""); }} options={(clinicsQuery.data ?? []).map((clinic) => ({ label: clinic.name, value: clinic.id }))} placeholder="Selectează clinica" required value={clinicId} /><Select disabled={!clinicId} label="Medic" onChange={(event) => { setDoctorId(event.target.value); setPatientId(""); setSelectedWorkId(null); setPatientSearch(""); }} options={[{ label: "Toți medicii", value: "" }, ...(doctorsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))]} placeholder="Toți medicii" value={doctorId} /></div>
        {clinicId ? <TextInput label="Caută pacient" placeholder="Nume și prenume" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} /> : <div className="dashboard-page__return-placeholder"><strong>Selectează clinica</strong><span>Alege mai întâi clinica pentru a vedea pacienții și probele revenite disponibile.</span></div>}
        {clinicId && patientsQuery.isLoading ? <LoadingState size="small" text="Se încarcă pacienții" /> : null}
        {clinicId ? <div className="dashboard-page__return-list dashboard-page__patient-list">{(patientsQuery.data ?? []).map((patient) => <button aria-label={patient.fullName} aria-pressed={patientId === patient.id} className={`dashboard-page__return-item${patientId === patient.id ? " dashboard-page__return-item--selected" : ""}`} key={patient.id} onClick={() => { setPatientId(patient.id); setSelectedWorkId(null); setSelectedWorkIds([]); setProbeTypeSelections({}); }} title={patient.fullName} type="button"><strong className="dashboard-page__return-patient">{patient.fullName}</strong></button>)}</div> : null}
        {selectedPatient ? <div className="dashboard-page__selected-patient"><strong>{selectedPatient.fullName}</strong><span>{patientCandidateRows.length} {patientCandidateRows.length === 1 ? "probă revenită disponibilă" : "probe revenite disponibile"}</span></div> : null}
        {clinicId && patientId ? <div className="dashboard-page__return-matches"><h4>Lucrări disponibile cu probe la curier</h4><p className="dashboard-page__empty-note">Selectează una sau mai multe probe revenite din același transport.</p><div className="dashboard-page__return-list dashboard-page__return-candidate-list">{patientCandidateRows.map((row) => <button aria-pressed={selectedWorkIds.includes(row.id)} className={`dashboard-page__return-item${selectedWorkIds.includes(row.id) ? " dashboard-page__return-item--selected" : ""}`} key={row.id} onClick={() => toggleWork(row.id)} type="button"><strong>{probeLabel(row)}</strong><span>{workLabel(row)}</span><span>{row.workCode}</span><small>Dinți: {teethLabel(row)}{row.shade ? ` · Culoare: ${row.shade}` : ""}</small></button>)}{!isLoading && patientCandidateRows.length === 0 ? <div className="dashboard-page__return-placeholder"><strong>Nicio probă revenită disponibilă</strong><span>Nu există lucrări eligibile pentru pacientul selectat.</span></div> : null}</div></div> : null}
      </section>
      <section className="dashboard-page__return-panel" aria-labelledby="status-probe-register-title">
        <h3 id="status-probe-register-title">2. Înregistrează revenirea</h3>
        {!hasSelectedWork ? <p className="dashboard-page__return-placeholder">Selectează una sau mai multe lucrări și configurează fiecare probă.</p> : <><div className="dashboard-page__selected-probe"><span>Lucrare activă pentru configurare</span><strong>{workLabel(selectedWork)}</strong><dl><div><dt>Dinți</dt><dd>{teethLabel(selectedWork)}</dd></div><div><dt>Culoare</dt><dd>{selectedWork.shade ?? "—"}</dd></div><div><dt>Cod lucrare</dt><dd>{selectedWork.workCode}</dd></div><div><dt>Pacient</dt><dd>{selectedWork.patient.name}</dd></div></dl></div><div className="dashboard-page__probe-history"><strong>Probe efectuate anterior</strong>{completedProbeHistory.length > 0 ? completedProbeHistory.map((cycle) => <div key={cycle.id}><span>{cycle.sequence === 0 ? "Proba inițială" : `Proba ${cycle.sequence}`}</span><strong>{cycle.probeTypeNameSnapshot}</strong></div>) : <span>Nu există probe efectuate anterior.</span>}</div>{selectedWorkQuery.isLoading ? <LoadingState size="small" text="Se încarcă tipurile compatibile" /> : null}{probeTypesQuery.isError ? <ErrorState title="Tipurile de probă nu au putut fi încărcate" description="Verifică accesul la catalogul tehnic și reîncarcă pagina." /> : null}{!probeTypesQuery.isError && selectableProbeTypes.length > 0 ? <fieldset className="dashboard-page__probe-types"><legend>Tipuri probă pentru această lucrare</legend><div className="dashboard-page__probe-type-cards">{selectableProbeTypes.map((type) => { const selected = probeTypeIds.includes(type.id); return <button aria-pressed={selected} className={`dashboard-page__probe-type-card${selected ? " dashboard-page__probe-type-card--selected" : ""}`} key={type.id} onClick={() => toggleProbeType(type.id)} type="button"><span className="dashboard-page__probe-type-name">{type.name}</span></button>; })}</div></fieldset> : null}<div className="dashboard-page__probe-schedule"><label>Data termenului probei *<input className="dl-control dashboard-page__probe-date" onChange={(event) => setDeadlineDate(event.target.value)} required type="date" value={deadlineDate} /></label><label>Ora termenului<input className="dl-control dashboard-page__probe-time" onChange={(event) => setDeadlineTime(event.target.value)} type="time" value={deadlineTime} /></label></div>{!allSelectedConfigured ? <p className="dashboard-page__empty-note">Configurează tipul probei pentru fiecare lucrare selectată.</p> : null}</>}
      </section>
    </div>
  </Modal>;
}
