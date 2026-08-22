import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DateInput, ErrorState, LoadingState, Modal, NumberInput, Select, Textarea, TextInput, useToast } from "@dental-lab/ui";
import { decimalStringToMinor, formatMoneyMinor, type TechnicianEarningsParams, type TechnicianOperationInput } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { fetchPermissions } from "../auth/auth-api.js";
import {
  useManagerTechnicianEarnings,
  useCreateTechnicianPayment,
  useCreateTechnicianOperation,
  useSetTechnicianRate,
  useTechnicianOperations,
  useTechnicianRates,
  useUpdateTechnicianOperation,
} from "../pricing/technician-operations-api.js";
import { fetchUsers, hasPermission } from "../users/users-api.js";
import { EarningsContent, EarningsFilters } from "../technician-earnings/technician-earnings-page.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./manager-technicians-page.css";

type EarningsPeriod = "DAY" | "MONTH" | "YEAR";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function ManagerTechniciansPage(): ReactNode {
  const toast = useToast();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadAllEarnings = hasPermission(permissionsQuery.data, "technician.earnings.read_all");
  const canReadRates = hasPermission(permissionsQuery.data, "technician.rates.read");
  const canManageRates = hasPermission(permissionsQuery.data, "technician.rates.manage");
  const canCreatePayments = hasPermission(permissionsQuery.data, "technician.payments.create");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [period, setPeriod] = useState<EarningsPeriod>("DAY");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(currentMonth());
  const [operationId, setOperationId] = useState("");
  const [rateDecimal, setRateDecimal] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today());
  const [paymentDecimal, setPaymentDecimal] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [operationCode, setOperationCode] = useState("");
  const [operationName, setOperationName] = useState("");
  const [operationDescription, setOperationDescription] = useState("");
  const [operationPriceDecimal, setOperationPriceDecimal] = useState("");
  const [editingOperationId, setEditingOperationId] = useState<string | null>(null);
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);
  const [operationSearch, setOperationSearch] = useState("");
  const techniciansQuery = useQuery({
    enabled: canReadAllEarnings || canReadRates,
    queryFn: () => fetchUsers({ isActive: true, page: 1, pageSize: 100, roleKey: "TEHNICIAN", search: undefined, sortBy: "displayName", sortDirection: "asc" }),
    queryKey: ["users", "technicians", "active"],
    retry: false,
  });
  const operationsQuery = useTechnicianOperations({ isActive: true, page: 1, pageSize: 100, sortBy: "name", sortDirection: "asc" }, canReadRates);
  const ratesQuery = useTechnicianRates(selectedTechnicianId || undefined, canReadRates && selectedTechnicianId !== "");
  const earningsParams = useMemo<TechnicianEarningsParams>(() => ({
    date: period === "DAY" ? date : undefined,
    month: period === "MONTH" ? month : undefined,
    period,
    technicianId: selectedTechnicianId || undefined,
  }), [date, month, period, selectedTechnicianId]);
  const earningsQuery = useManagerTechnicianEarnings(earningsParams, canReadAllEarnings);
  const setRateMutation = useSetTechnicianRate();
  const paymentMutation = useCreateTechnicianPayment();
  const createOperationMutation = useCreateTechnicianOperation();
  const updateOperationMutation = useUpdateTechnicianOperation();

  function submitRate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedRate = decimalStringToMinor(rateDecimal);
    if (!parsedRate.ok) {
      toast.showToast({ message: "Folosește o sumă cu maximum 2 zecimale.", title: "Rata nu a fost salvată", variant: "error" });
      return;
    }
    if (!selectedTechnicianId || !operationId) {
      toast.showToast({ message: "Alege tehnicianul și manopera.", title: "Rata nu a fost salvată", variant: "error" });
      return;
    }

    setRateMutation.mutate({
      currency: "RON",
      ...(effectiveFrom ? { effectiveFrom: `${effectiveFrom}T00:00:00.000Z` } : {}),
      operationId,
      rateMinor: parsedRate.value,
      technicianId: selectedTechnicianId,
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Rata nu a fost salvată", variant: "error" }),
      onSuccess: () => {
        setRateDecimal("");
        toast.showToast({ message: "Rata viitoare a fost salvată.", variant: "success" });
      },
    });
  }

  function submitPayment(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsed = decimalStringToMinor(paymentDecimal);
    if (!selectedTechnicianId || !parsed.ok || parsed.value <= 0) {
      toast.showToast({ message: "Alege tehnicianul și introdu o sumă validă.", title: "Plata nu a fost salvată", variant: "error" });
      return;
    }
    paymentMutation.mutate({ amountMinor: parsed.value, notes: paymentNotes || null, technicianId: selectedTechnicianId }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Plata nu a fost salvată", variant: "error" }),
      onSuccess: () => { setPaymentDecimal(""); setPaymentNotes(""); toast.showToast({ message: "Plata tehnicianului a fost înregistrată.", variant: "success" }); },
    });
  }

  function resetOperationForm(): void {
    setEditingOperationId(null);
    setOperationCode("");
    setOperationName("");
    setOperationDescription("");
    setOperationPriceDecimal("");
  }

  function submitOperation(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const input: TechnicianOperationInput = { code: operationCode.trim(), description: operationDescription.trim() || null, name: operationName.trim() };
    if (input.code.length === 0 || input.name.length < 2) {
      toast.showToast({ message: "Completează codul și denumirea manoperei.", title: "Manopera nu a fost salvată", variant: "error" });
      return;
    }
    const parsedPrice = operationPriceDecimal.trim() === "" ? null : decimalStringToMinor(operationPriceDecimal);
    if (parsedPrice && !parsedPrice.ok) {
      toast.showToast({ message: "Prețul trebuie să fie o sumă validă cu maximum 2 zecimale.", title: "Manopera nu a fost salvată", variant: "error" });
      return;
    }
    const callbacks = {
      onError: (error: unknown) => toast.showToast({ message: getErrorMessage(error), title: "Manopera nu a fost salvată", variant: "error" }),
      onSuccess: (operation: { id: string }) => {
        if (parsedPrice?.ok && selectedTechnicianId) {
          setRateMutation.mutate({ currency: "RON", effectiveFrom: `${effectiveFrom}T00:00:00.000Z`, operationId: operation.id, rateMinor: parsedPrice.value, technicianId: selectedTechnicianId }, {
            onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Manopera a fost salvată, dar prețul nu a fost salvat", variant: "error" }),
            onSuccess: () => toast.showToast({ message: "Manopera și prețul tehnicianului au fost salvate.", variant: "success" }),
          });
        } else {
          toast.showToast({ message: editingOperationId ? "Manopera a fost modificată." : "Manopera a fost adăugată.", variant: "success" });
        }
        resetOperationForm();
        setIsOperationModalOpen(false);
      },
    };
    if (editingOperationId) {
      updateOperationMutation.mutate({ id: editingOperationId, input }, callbacks);
    } else {
      createOperationMutation.mutate(input, callbacks);
    }
  }

  if (permissionsQuery.isLoading) {
    return <PageFrame><LoadingState text="Se încarcă tehnicienii" /></PageFrame>;
  }

  if (!canReadAllEarnings) {
    return <PageFrame><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea technician.earnings.read_all." /></PageFrame>;
  }

  const technicians = techniciansQuery.data?.items ?? [];
  const operations = operationsQuery.data?.items ?? [];
  const visibleOperations = operations.filter((operation) => `${operation.code} ${operation.name} ${operation.description ?? ""}`.toLocaleLowerCase().includes(operationSearch.trim().toLocaleLowerCase()));

  return (
    <main className="manager-technicians">
      <section className="dl-container manager-technicians__layout" aria-labelledby="manager-technicians-title">
        <header className="manager-technicians__header">
          <div>
            <h1 id="manager-technicians-title">Tehnicieni</h1>
            <p>Câștiguri realizate, rate pe manoperă și achitări către tehnicieni.</p>
          </div>
          {canManageRates ? <Button onClick={() => { resetOperationForm(); setIsOperationModalOpen(true); }} type="button">Adaugă manoperă</Button> : null}
        </header>

        <Card>
          <CardContent className="manager-technicians__filters">
            <Select
              label="Tehnician"
              onChange={(event) => setSelectedTechnicianId(event.target.value)}
              options={[{ label: "Toți tehnicienii", value: "" }, ...technicians.map((technician) => ({ label: technician.displayName, value: technician.id }))]}
              value={selectedTechnicianId}
            />
          </CardContent>
        </Card>

        <EarningsFilters date={date} month={month} onDateChange={setDate} onMonthChange={setMonth} onPeriodChange={(value) => setPeriod(value)} period={period} />
        <EarningsContent data={earningsQuery.data} error={earningsQuery.isError ? getErrorMessage(earningsQuery.error) : undefined} isLoading={earningsQuery.isLoading} paymentPerspective="manager" />

        {canReadRates ? (
          <Card>
            <CardHeader>
              <CardTitle>Catalog manopere</CardTitle>
              <CardDescription>Manoperele seeduite și cele adăugate de Manager pot primi rate diferite pentru fiecare tehnician.</CardDescription>
            </CardHeader>
            <CardContent>
              <TextInput label="Caută manoperă" onChange={(event) => setOperationSearch(event.target.value)} placeholder="Cod, denumire sau descriere" value={operationSearch} />
              <div className="manager-technicians__operation-list">
                {visibleOperations.map((operation) => (
                  <div className="manager-technicians__operation" key={operation.id}>
                    <div><strong>{operation.code} · {operation.name}</strong>{operation.description ? <span>{operation.description}</span> : null}</div>
                    <Button disabled={!canManageRates} onClick={() => { setEditingOperationId(operation.id); setOperationCode(operation.code); setOperationName(operation.name); setOperationDescription(operation.description ?? ""); setOperationPriceDecimal(""); setIsOperationModalOpen(true); }} size="small" type="button" variant="outline">Editează</Button>
                  </div>
                ))}
                {visibleOperations.length === 0 ? <p className="manager-technicians__muted">Nu există manopere pentru această căutare.</p> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Modal description="Completează catalogul și, opțional, prețul pentru tehnicianul selectat." isOpen={isOperationModalOpen} onOpenChange={(open) => { if (!open) resetOperationForm(); setIsOperationModalOpen(open); }} size="lg" title={editingOperationId ? "Editează manoperă" : "Adaugă manoperă"}>
          <form className="manager-technicians__stack" onSubmit={submitOperation}>
            <div className="manager-technicians__rate-form">
              <TextInput label="Cod" onChange={(event) => setOperationCode(event.target.value)} value={operationCode} />
              <TextInput label="Denumire" onChange={(event) => setOperationName(event.target.value)} value={operationName} />
            </div>
            <Textarea label="Descriere" onChange={(event) => setOperationDescription(event.target.value)} rows={3} value={operationDescription} />
            <NumberInput label="Preț / câștig RON" onChange={(event) => setOperationPriceDecimal(event.target.value)} value={operationPriceDecimal} />
            <p className="manager-technicians__muted">Prețul se salvează pentru tehnicianul selectat: {selectedTechnicianId ? technicians.find((technician) => technician.id === selectedTechnicianId)?.displayName ?? "tehnician" : "alege un tehnician din selectorul de mai sus"}.</p>
            <div className="manager-technicians__form-actions">
              <Button disabled={createOperationMutation.isPending || updateOperationMutation.isPending || setRateMutation.isPending} type="submit">{editingOperationId ? "Salvează modificarea" : "Adaugă manoperă"}</Button>
              <Button onClick={() => { resetOperationForm(); setIsOperationModalOpen(false); }} type="button" variant="outline">Anulează</Button>
            </div>
          </form>
        </Modal>

        {canReadRates ? (
          <Card>
            <CardHeader>
              <CardTitle>Rate viitoare</CardTitle>
              <CardDescription>Ratele se folosesc pentru manopere viitoare; câștigurile istorice rămân snapshots.</CardDescription>
            </CardHeader>
            <CardContent className="manager-technicians__stack">
              <form className="manager-technicians__rate-form" onSubmit={submitRate}>
                <Select
                  label="Manoperă"
                  onChange={(event) => setOperationId(event.target.value)}
                  options={operations.map((operation) => ({ label: `${operation.code} · ${operation.name}`, value: operation.id }))}
                  placeholder="Alege manopera"
                  value={operationId}
                />
                <NumberInput label="Câștig RON" onChange={(event) => setRateDecimal(event.target.value)} value={rateDecimal} />
                <DateInput label="Valabil de la" onChange={(event) => setEffectiveFrom(event.target.value)} value={effectiveFrom} />
                <Button disabled={!canManageRates || setRateMutation.isPending} type="submit">Salvează rata</Button>
              </form>
              {ratesQuery.isError ? <ErrorState title="Ratele nu pot fi încărcate" description={getErrorMessage(ratesQuery.error)} /> : null}
              <div className="manager-technicians__rates" aria-label="Rate curente">
                {(ratesQuery.data ?? []).map((rate) => (
                  <div className="manager-technicians__rate" key={rate.id}>
                    <span>{rate.operation.code} · {rate.operation.name}</span>
                    <strong>{formatMoneyMinor(rate.rateMinor, rate.currency)}</strong>
                    <span>de la {rate.effectiveFrom.slice(0, 10)}</span>
                  </div>
                ))}
                {selectedTechnicianId && !ratesQuery.isLoading && (ratesQuery.data ?? []).length === 0 ? <p className="manager-technicians__muted">Nu există rate curente pentru tehnicianul selectat.</p> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
        {selectedTechnicianId ? (
          <Card>
            <CardHeader><CardTitle>Înregistrează achitarea</CardTitle><CardDescription>Achitarea reduce automat suma restantă pentru tehnicianul selectat.</CardDescription></CardHeader>
            <CardContent>
              <form className="manager-technicians__rate-form" onSubmit={submitPayment}>
                <NumberInput label="Sumă RON" onChange={(event) => setPaymentDecimal(event.target.value)} value={paymentDecimal} />
                <label className="manager-technicians__field"><span>Notă</span><input onChange={(event) => setPaymentNotes(event.target.value)} value={paymentNotes} /></label>
                <Button disabled={!canCreatePayments || paymentMutation.isPending} type="submit">Înregistrează plata</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="manager-technicians"><section className="dl-container">{children}</section></main>;
}
