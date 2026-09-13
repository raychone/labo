import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DateInput,
  ErrorState,
  LoadingState,
  Modal,
  NumberInput,
  Select,
  Textarea,
  TextInput,
  useToast,
} from "@dental-lab/ui";
import {
  decimalStringToMinor,
  formatMoneyMinor,
  type TechnicianEarningsParams,
  type TechnicianEarningsSummary,
  type TechnicianOperationQuantityRule,
  type TechnicianRateView,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";

import { getErrorMessage } from "../../lib/form-utils.js";
import { fetchPermissions } from "../auth/auth-api.js";
import {
  useCreateTechnicianPayment,
  useManagerTechnicianEarnings,
  useSetTechnicianRate,
  useTechnicianOperations,
  useTechnicianRates,
} from "../pricing/technician-operations-api.js";
import { EarningsFilters } from "../technician-earnings/technician-earnings-page.js";
import { fetchUsers, hasPermission } from "../users/users-api.js";
import "./manager-technicians-page.css";

type Period = "DAY" | "MONTH" | "YEAR";
type Tab = "RATES" | "VALUE" | "PAYMENTS" | "HISTORY";

const TABS: readonly { id: Tab; label: string }[] = [
  { id: "RATES", label: "Manopere & tarife" },
  { id: "VALUE", label: "Câștiguri" },
  { id: "PAYMENTS", label: "Plăți" },
  { id: "HISTORY", label: "Istoric" },
];

const TAB_QUERY_VALUES: Readonly<Record<Tab, string>> = {
  HISTORY: "history",
  PAYMENTS: "payments",
  RATES: "rates",
  VALUE: "earnings",
};

function readTab(searchParams: URLSearchParams): Tab {
  const requested = searchParams.get("tab");
  return TABS.find((item) => TAB_QUERY_VALUES[item.id] === requested)?.id ?? "RATES";
}

const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
const dateOnly = (value: string) => new Intl.DateTimeFormat("ro-RO", { dateStyle: "long" }).format(new Date(value));

export function ManagerTechniciansPage(): ReactNode {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const permissions = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canEarnings = hasPermission(permissions.data, "technician.earnings.read_all");
  const canRates = hasPermission(permissions.data, "technician.rates.read");
  const canManageRates = hasPermission(permissions.data, "technician.rates.manage");
  const canPay = hasPermission(permissions.data, "technician.payments.create");
  const [technicianId, setTechnicianId] = useState(() => searchParams.get("technicianId") ?? "");
  const [search, setSearch] = useState("");
  const tab = readTab(searchParams);
  const [period, setPeriod] = useState<Period>("MONTH");
  const [date, setDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(month());
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
  const [rateMode, setRateMode] = useState<"add" | "update">("add");
  const [operationId, setOperationId] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today());

  const techniciansQuery = useQuery({
    enabled: canEarnings || canRates,
    queryFn: () => fetchUsers({ isActive: undefined, page: 1, pageSize: 100, roleKey: "TEHNICIAN", search: undefined, sortBy: "displayName", sortDirection: "asc" }),
    queryKey: ["users", "technicians", "all"],
    retry: false,
  });
  const technicians = techniciansQuery.data?.items ?? [];
  const selected = technicians.find((item) => item.id === technicianId) ?? null;
  const matchingTechnicians = technicians.filter((item) => `${item.displayName} ${item.email}`.toLocaleLowerCase("ro-RO").includes(search.trim().toLocaleLowerCase("ro-RO")));

  useEffect(() => {
    if (!technicians.length) return;
    const requestedTechnicianId = searchParams.get("technicianId");
    const nextTechnicianId = requestedTechnicianId && technicians.some((item) => item.id === requestedTechnicianId)
      ? requestedTechnicianId
      : technicians[0]!.id;
    if (technicianId !== nextTechnicianId) setTechnicianId(nextTechnicianId);
    if (requestedTechnicianId !== nextTechnicianId) {
      const next = new URLSearchParams(searchParams);
      next.set("technicianId", nextTechnicianId);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, technicianId, technicians]);

  useEffect(() => {
    setPaymentOpen(false);
    setRateOpen(false);
    setOperationId("");
    setPaymentAmount("");
    setRateAmount("");
  }, [technicianId]);

  const params = useMemo<TechnicianEarningsParams & { includeRemoved?: boolean }>(() => ({
    ...(period === "DAY" ? { date } : {}),
    ...(includeRemoved ? { includeRemoved: true } : {}),
    ...(period === "MONTH" ? { month: selectedMonth } : period === "YEAR" ? { month: `${selectedMonth.slice(0, 4)}-01` } : {}),
    period,
    ...(technicianId ? { technicianId } : {}),
  }), [date, includeRemoved, period, selectedMonth, technicianId]);
  const earnings = useManagerTechnicianEarnings(params, canEarnings && !!technicianId);
  const rates = useTechnicianRates(technicianId || undefined, canRates && !!technicianId);
  const operations = useTechnicianOperations({ isActive: true, page: 1, pageSize: 100, sortBy: "name", sortDirection: "asc" }, canRates);
  const paymentMutation = useCreateTechnicianPayment();
  const rateMutation = useSetTechnicianRate();
  const fail = (title: string) => (error: unknown) => toast.showToast({ message: getErrorMessage(error), title, variant: "error" });
  const selectedOperationHasRate = operationId !== "" && (rates.data ?? []).some((rate) => rate.operation.id === operationId);
  const rateModalTitle = rateMode === "update" || selectedOperationHasRate ? "Actualizează tarif" : "Adaugă tarif";
  const paymentBalanceMinor = earnings.data?.currencyTotals.find((item) => item.currency === "RON")?.balanceMinor ?? earnings.data?.remainingMinor ?? 0;

  function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = decimalStringToMinor(paymentAmount);
    if (!parsed.ok || parsed.value <= 0 || !technicianId) {
      toast.showToast({ message: "Introdu o sumă pozitivă cu maximum 2 zecimale.", title: "Plata nu a fost salvată", variant: "error" });
      return;
    }
    paymentMutation.mutate({ amountMinor: parsed.value, currency: "RON", notes: paymentNotes.trim() || null, paidAt: `${paymentDate}T12:00:00.000Z`, technicianId }, {
      onError: fail("Plata nu a fost salvată"),
      onSuccess: () => {
        setPaymentOpen(false);
        toast.showToast({ message: "Plata a fost înregistrată.", variant: "success" });
      },
    });
  }

  function saveRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = decimalStringToMinor(rateAmount);
    if (!parsed.ok || parsed.value < 0 || !operationId || !technicianId) {
      toast.showToast({ message: "Alege manopera și introdu un tarif valid.", title: "Tariful nu a fost salvat", variant: "error" });
      return;
    }
    rateMutation.mutate({ currency: "RON", effectiveFrom: `${effectiveFrom}T00:00:00.000Z`, operationId, rateMinor: parsed.value, technicianId }, {
      onError: fail("Tariful nu a fost salvat"),
      onSuccess: () => {
        setRateOpen(false);
        toast.showToast({ message: "Tariful a fost salvat pentru execuțiile viitoare. Câștigurile existente rămân neschimbate.", variant: "success" });
      },
    });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentTab: Tab) {
    const currentIndex = TABS.findIndex((item) => item.id === currentTab);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextTab = TABS[nextIndex]!;
    selectTab(nextTab.id);
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-tab="${nextTab.id}"]`)?.focus();
  }

  function selectTab(nextTab: Tab): void {
    const next = new URLSearchParams(searchParams);
    next.set("tab", TAB_QUERY_VALUES[nextTab]);
    setSearchParams(next);
  }

  function selectTechnician(nextTechnicianId: string): void {
    setTechnicianId(nextTechnicianId);
    const next = new URLSearchParams(searchParams);
    next.set("technicianId", nextTechnicianId);
    setSearchParams(next);
  }

  if (permissions.isLoading) return <Frame><LoadingState text="Se încarcă tehnicienii" /></Frame>;
  if (!canEarnings) return <Frame><ErrorState description="Contul curent nu are acces la câștigurile tehnicienilor." title="Acces refuzat" /></Frame>;

  return (
    <main className="manager-technicians">
      <section className="dl-container manager-technicians__layout">
        <header className="manager-technicians__header">
          <div><p className="manager-technicians__eyebrow">Management echipă</p><h1>Tehnicieni</h1><p>Tarife individuale, câștiguri, plăți și istoric într-un singur workspace.</p></div>
        </header>

        <div className="manager-technicians__workspace">
          <aside className="manager-technicians__master">
            <div className="manager-technicians__desktop-selector">
              <div className="manager-technicians__master-heading"><strong>Tehnicieni</strong><span>{technicians.length} înregistrări</span></div>
              <TextInput label="Caută tehnician" onChange={(event) => setSearch(event.target.value)} placeholder="Nume sau e-mail" type="search" value={search} />
              <div className="manager-technicians__technician-list">
                {matchingTechnicians.map((item) => (
                  <button aria-pressed={technicianId === item.id} className={`manager-technicians__technician${technicianId === item.id ? " manager-technicians__technician--selected" : ""}`} key={item.id} onClick={() => selectTechnician(item.id)} type="button">
                    <span className="manager-technicians__avatar">{initials(item.displayName)}</span>
                    <span className="manager-technicians__technician-copy"><strong>{item.displayName}</strong><small>{item.email}</small><span className={`manager-technicians__technician-status${item.isActive ? " manager-technicians__technician-status--active" : ""}`}>{item.isActive ? "Activ" : "Inactiv"}</span></span>
                  </button>
                ))}
                {!techniciansQuery.isLoading && !matchingTechnicians.length ? <Empty text="Nu există tehnicieni potriviți." /> : null}
              </div>
            </div>
            <div className="manager-technicians__mobile-selector"><Select label="Tehnician" onChange={(event) => selectTechnician(event.target.value)} options={technicians.map((item) => ({ label: `${item.displayName} · ${item.isActive ? "Activ" : "Inactiv"}`, secondary: item.email, value: item.id }))} placeholder="Selectează tehnicianul" value={technicianId} /></div>
          </aside>

          <section className="manager-technicians__detail">
            {!selected ? <div className="manager-technicians__empty-selection"><span>T</span><h2>Selectează un tehnician</h2><p>Tarifele, câștigurile, plățile și istoricul apar aici.</p></div> : <>
              <header className="manager-technicians__detail-header"><span className="manager-technicians__avatar manager-technicians__avatar--large">{initials(selected.displayName)}</span><div><div className="manager-technicians__detail-title"><h2>{selected.displayName}</h2><b className={selected.isActive ? "manager-technicians__status manager-technicians__status--active" : "manager-technicians__status"}>{selected.isActive ? "Activ" : "Inactiv"}</b></div><p>{selected.email}</p></div></header>
              <nav aria-label="Secțiuni tehnician" className="manager-technicians__tabs" role="tablist">{TABS.map((item) => <button aria-controls={`manager-technicians-panel-${item.id.toLowerCase()}`} aria-selected={tab === item.id} data-tab={item.id} id={`manager-technicians-tab-${item.id.toLowerCase()}`} key={item.id} onClick={() => selectTab(item.id)} onKeyDown={(event) => handleTabKeyDown(event, item.id)} role="tab" tabIndex={tab === item.id ? 0 : -1} type="button">{item.label}</button>)}</nav>
              {tab !== "RATES" ? <div className="manager-technicians__period"><EarningsFilters date={date} month={selectedMonth} onDateChange={setDate} onMonthChange={setSelectedMonth} onPeriodChange={setPeriod} period={period} />{tab !== "PAYMENTS" ? <label className="manager-technicians__removed"><input checked={includeRemoved} onChange={(event) => setIncludeRemoved(event.target.checked)} type="checkbox" /> <span>Include manopere eliminate</span></label> : null}</div> : null}
              <div aria-labelledby={`manager-technicians-tab-${tab.toLowerCase()}`} id={`manager-technicians-panel-${tab.toLowerCase()}`} role="tabpanel">
                {tab === "RATES" ? <Rates data={rates.data ?? []} error={rates.isError ? getErrorMessage(rates.error) : undefined} loading={rates.isLoading} manage={canManageRates} onAdd={() => { setRateMode("add"); setOperationId(""); setRateAmount(""); setEffectiveFrom(today()); setRateOpen(true); }} onEdit={(rate) => { setRateMode("update"); setOperationId(rate.operation.id); setRateAmount((rate.rateMinor / 100).toFixed(2)); setEffectiveFrom(today()); setRateOpen(true); }} /> : null}
                {tab === "VALUE" ? <Value data={earnings.data} error={earnings.isError ? getErrorMessage(earnings.error) : undefined} loading={earnings.isLoading} /> : null}
                {tab === "PAYMENTS" ? <Payments canPay={canPay} data={earnings.data} error={earnings.isError ? getErrorMessage(earnings.error) : undefined} loading={earnings.isLoading} open={() => { setPaymentAmount(""); setPaymentNotes(""); setPaymentDate(today()); setPaymentOpen(true); }} /> : null}
                {tab === "HISTORY" ? <History data={earnings.data} error={earnings.isError ? getErrorMessage(earnings.error) : undefined} loading={earnings.isLoading} /> : null}
              </div>
            </>}
          </section>
        </div>

        <Modal description="Plata este adăugată în istoricul tehnicianului, iar soldul este actualizat după salvare." isOpen={paymentOpen} onOpenChange={setPaymentOpen} size="sm" title="Înregistrează plată">
          <form className="manager-technicians__modal-form" onSubmit={savePayment}>
            <div className="manager-technicians__payment-context"><span>Tehnician</span><strong>{selected?.displayName}</strong><span>Sold de plată</span><strong>{formatMoneyMinor(paymentBalanceMinor, "RON")}</strong></div>
            <div className="manager-technicians__modal-grid"><div className="manager-technicians__money-field"><NumberInput label="Sumă" onChange={(event) => setPaymentAmount(event.target.value)} value={paymentAmount} /><span aria-hidden="true">RON</span></div><DateInput label="Data plății" onChange={(event) => setPaymentDate(event.target.value)} value={paymentDate} /></div>
            <Textarea label="Observații" onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Opțional" rows={3} value={paymentNotes} />
            <Actions cancel={() => setPaymentOpen(false)} disabled={paymentMutation.isPending} submit="Înregistrează plata" />
          </form>
        </Modal>
        <Modal description="Tariful nou se aplică doar execuțiilor viitoare." isOpen={rateOpen} onOpenChange={setRateOpen} size="sm" title={rateModalTitle}>
          <form className="manager-technicians__modal-form" onSubmit={saveRate}>
            <Select disabled={rateMode === "update"} label="Manoperă" onChange={(event) => setOperationId(event.target.value)} options={(operations.data?.items ?? []).map((item) => ({ label: item.name, secondary: item.category, value: item.id }))} placeholder="Alege manopera" value={operationId} />
            <div className="manager-technicians__modal-grid"><div className="manager-technicians__money-field"><NumberInput label="Tarif" onChange={(event) => setRateAmount(event.target.value)} value={rateAmount} /><span aria-hidden="true">RON</span></div><DateInput label="Valabil din" onChange={(event) => setEffectiveFrom(event.target.value)} value={effectiveFrom} /></div>
            <Actions cancel={() => setRateOpen(false)} disabled={rateMutation.isPending || !canManageRates} submit="Salvează tariful" />
          </form>
        </Modal>
      </section>
    </main>
  );
}

function Summary({ data, includeWorks = false }: { data: TechnicianEarningsSummary; includeWorks?: boolean }) {
  const totals = data.currencyTotals.length ? data.currencyTotals : [{ balanceMinor: data.remainingMinor, currency: data.currency, periodEarnedMinor: data.totalMinor, periodPaidMinor: data.paidMinor }];
  return <div className="manager-technicians__summary">{totals.flatMap((item) => [
    <Card className="manager-technicians__kpi" key={`${item.currency}-earned`}><CardHeader><CardDescription>Câștigat în perioadă</CardDescription><CardTitle>{formatMoneyMinor(item.periodEarnedMinor, item.currency)}</CardTitle></CardHeader></Card>,
    <Card className="manager-technicians__kpi" key={`${item.currency}-paid`}><CardHeader><CardDescription>Plătit în perioadă</CardDescription><CardTitle>{formatMoneyMinor(item.periodPaidMinor, item.currency)}</CardTitle></CardHeader></Card>,
    <Card className="manager-technicians__kpi" key={`${item.currency}-balance`}><CardHeader><CardDescription>Sold total de plată</CardDescription><CardTitle className={item.balanceMinor < 0 ? "manager-technicians__negative" : undefined}>{formatMoneyMinor(item.balanceMinor, item.currency)}</CardTitle></CardHeader></Card>,
  ])}{includeWorks ? <Card className="manager-technicians__kpi"><CardHeader><CardDescription>Lucrări în perioadă</CardDescription><CardTitle>{data.works.length}</CardTitle></CardHeader></Card> : null}</div>;
}

function Value({ data, error, loading }: { data: TechnicianEarningsSummary | undefined; error: string | undefined; loading: boolean }) {
  if (loading) return <LoadingState text="Se încarcă câștigurile" />;
  if (error) return <ErrorState description={error} title="Câștigurile nu pot fi încărcate" />;
  if (!data) return null;
  const rows = data.works.flatMap((work) => work.operations.map((operation) => ({ ...operation, patient: work.patientName, work: work.workCode })));
  return <div className="manager-technicians__tab-content"><Summary data={data} includeWorks /><Card><CardHeader><CardTitle>Câștiguri pe manopere</CardTitle><CardDescription>Valorile afișate sunt cele valabile la momentul efectuării manoperei.</CardDescription></CardHeader><CardContent>{!rows.length ? <Empty text="Nu există manopere realizate în perioada selectată." /> : <Table headers={["Lucrare", "Manoperă", "Data", "Cantitate", "Tarif aplicat", "Câștig"]} rows={rows.map((row) => [<><strong>{row.work}</strong><small>{row.patient}</small></>, <><span>{row.operation.name}</span>{row.removedAt ? <small>Eliminată din evidența curentă</small> : null}</>, dateOnly(row.performedAt), formatQuantity(row.quantity, row.operation.quantityRule), row.rateMinorSnapshot === null ? "—" : formatMoneyMinor(row.rateMinorSnapshot, row.currency), <strong>{formatMoneyMinor(row.earningMinor, row.currency)}</strong>])} />}</CardContent></Card></div>;
}

function Payments({ canPay, data, error, loading, open }: { canPay: boolean; data: TechnicianEarningsSummary | undefined; error: string | undefined; loading: boolean; open: () => void }) {
  if (loading) return <LoadingState text="Se încarcă plățile" />;
  if (error) return <ErrorState description={error} title="Plățile nu pot fi încărcate" />;
  if (!data) return null;
  return <div className="manager-technicians__tab-content"><div className="manager-technicians__tab-toolbar"><div><h3>Plăți</h3><p>Urmărește sumele achitate și soldul rămas.</p></div>{canPay ? <Button onClick={open} type="button">Înregistrează plată</Button> : null}</div><Summary data={data} /><Card><CardContent>{!data.payments.length ? <Empty text="Nu există plăți înregistrate în perioada selectată." /> : <Table headers={["Data", "Sumă", "Înregistrat de", "Observații"]} rows={data.payments.map((item) => [dateOnly(item.paidAt), <strong>{formatMoneyMinor(item.amountMinor, item.currency)}</strong>, item.createdByDisplayName ?? "Utilizator autorizat", item.notes || "—"])} />}</CardContent></Card></div>;
}

function History({ data, error, loading }: { data: TechnicianEarningsSummary | undefined; error: string | undefined; loading: boolean }) {
  if (loading) return <LoadingState text="Se încarcă istoricul" />;
  if (error) return <ErrorState description={error} title="Istoricul nu poate fi încărcat" />;
  if (!data) return null;
  const entries = [
    ...data.works.flatMap((work) => work.operations.map((operation) => ({ amount: operation.earningMinor, at: operation.performedAt, currency: operation.currency, id: operation.performedOperationId, kind: "earning" as const, operation, workCode: work.workCode }))),
    ...data.payments.map((payment) => ({ amount: payment.amountMinor, at: payment.paidAt, currency: payment.currency, id: payment.id, kind: "payment" as const, payment })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const groups = new Map<string, typeof entries>();
  entries.forEach((entry) => { const key = entry.at.slice(0, 10); groups.set(key, [...(groups.get(key) ?? []), entry]); });
  return <Card className="manager-technicians__history-card"><CardHeader><CardTitle>Istoric</CardTitle><CardDescription>Manopere și plăți în ordine cronologică. Valorile rămân cele valabile la data înregistrării.</CardDescription></CardHeader><CardContent>{!entries.length ? <Empty text="Nu există evenimente în perioada selectată." /> : <div className="manager-technicians__timeline">{[...groups].map(([day, values]) => <section key={day}><h3>{dateOnly(`${day}T12:00:00.000Z`)}</h3>{values.map((entry) => <div className={`manager-technicians__timeline-event manager-technicians__timeline-event--${entry.kind}`} key={`${entry.kind}-${entry.id}`}><span aria-hidden="true" /><div>{entry.kind === "earning" ? <><strong>MANOPERĂ</strong><p>{entry.workCode} · {entry.operation.operation.name}</p><small>{formatQuantity(entry.operation.quantity, entry.operation.operation.quantityRule)}{entry.operation.removedAt ? " · Eliminată din evidența curentă" : ""}</small></> : <><strong>PLATĂ</strong><p>Înregistrată de {entry.payment.createdByDisplayName ?? "utilizator autorizat"}</p>{entry.payment.notes ? <small>{entry.payment.notes}</small> : null}</>}</div><b>{entry.kind === "earning" ? "+" : "−"}{formatMoneyMinor(entry.amount, entry.currency)}</b></div>)}</section>)}</div>}</CardContent></Card>;
}

function Rates({ data, error, loading, manage, onAdd, onEdit }: { data: readonly TechnicianRateView[]; error: string | undefined; loading: boolean; manage: boolean; onAdd: () => void; onEdit: (item: TechnicianRateView) => void }) {
  return <div className="manager-technicians__tab-content"><div className="manager-technicians__tab-toolbar"><div><h3>Manopere & tarife</h3><p>Modificarea tarifului se aplică lucrărilor viitoare. Istoricul câștigurilor rămâne neschimbat.</p></div><div className="manager-technicians__toolbar-actions"><Link className="manager-technicians__catalog-link" to="/pricing?tab=operations">Catalog manopere →</Link>{manage ? <Button onClick={onAdd} type="button">Adaugă tarif</Button> : null}</div></div>{loading ? <LoadingState text="Se încarcă tarifele" /> : error ? <ErrorState description={error} title="Tarifele nu pot fi încărcate" /> : <Card><CardContent>{!data.length ? <Empty text="Nu există tarife pentru tehnicianul selectat." /> : <Table headers={["Manoperă", "Categorie", "Tarif curent", "Valabil din", "Acțiuni"]} rows={data.map((item) => [<strong>{item.operation.name}</strong>, item.operation.category, <strong>{formatMoneyMinor(item.rateMinor, item.currency)}</strong>, dateOnly(item.effectiveFrom), manage ? <Button onClick={() => onEdit(item)} size="small" type="button" variant="outline">Actualizează</Button> : "—"])} />}</CardContent></Card>}</div>;
}

function formatQuantity(quantity: number | null, rule: TechnicianOperationQuantityRule | undefined): string {
  if (quantity === null) return "—";
  if (rule === "PER_ELEMENT") return `${quantity} ${quantity === 1 ? "element" : "elemente"}`;
  if (rule === "PER_ARCH") return `${quantity} ${quantity === 1 ? "arcadă" : "arcade"}`;
  if (rule === "PER_WORK") return `${quantity} ${quantity === 1 ? "lucrare" : "lucrări"}`;
  return `${quantity} ${quantity === 1 ? "unitate" : "unități"}`;
}

function Table({ headers, rows }: { headers: readonly string[]; rows: readonly (readonly ReactNode[])[] }) { return <div className="manager-technicians__table-wrap"><table className="manager-technicians__table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td data-label={headers[cellIndex]} key={headers[cellIndex]}>{cell}</td>)}</tr>)}</tbody></table></div>; }
function Actions({ cancel, disabled, submit }: { cancel: () => void; disabled: boolean; submit: string }) { return <div className="manager-technicians__actions"><Button onClick={cancel} type="button" variant="outline">Renunță</Button><Button disabled={disabled} type="submit">{submit}</Button></div>; }
function Empty({ text }: { text: string }) { return <p className="manager-technicians__empty-data">{text}</p>; }
function Frame({ children }: { children: ReactNode }) { return <main className="manager-technicians"><section className="dl-container">{children}</section></main>; }
