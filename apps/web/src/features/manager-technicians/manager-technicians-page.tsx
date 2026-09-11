import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DateInput, ErrorState, LoadingState, Modal, NumberInput, Select, Textarea, TextInput, useToast } from "@dental-lab/ui";
import { decimalStringToMinor, formatMoneyMinor, type TechnicianEarningsParams, type TechnicianEarningsSummary } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { getErrorMessage } from "../../lib/form-utils.js";
import { fetchPermissions } from "../auth/auth-api.js";
import { useCreateTechnicianPayment, useManagerTechnicianEarnings, useSetTechnicianRate, useTechnicianOperations, useTechnicianRates } from "../pricing/technician-operations-api.js";
import { EarningsFilters } from "../technician-earnings/technician-earnings-page.js";
import { fetchUsers, hasPermission } from "../users/users-api.js";
import "./manager-technicians-page.css";

type Period = "DAY" | "MONTH" | "YEAR";
type Tab = "RATES" | "VALUE" | "PAYMENTS" | "HISTORY";

const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "T";
const dateTime = (value: string) => new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const dateOnly = (value: string) => new Intl.DateTimeFormat("ro-RO", { dateStyle: "long" }).format(new Date(value));

export function ManagerTechniciansPage(): ReactNode {
  const toast = useToast();
  const permissions = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canEarnings = hasPermission(permissions.data, "technician.earnings.read_all");
  const canRates = hasPermission(permissions.data, "technician.rates.read");
  const canManageRates = hasPermission(permissions.data, "technician.rates.manage");
  const canPay = hasPermission(permissions.data, "technician.payments.create");
  const [technicianId, setTechnicianId] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("VALUE");
  const [period, setPeriod] = useState<Period>("MONTH");
  const [date, setDate] = useState(today());
  const [selectedMonth, setSelectedMonth] = useState(month());
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentNotes, setPaymentNotes] = useState("");
  const [rateOpen, setRateOpen] = useState(false);
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
    if (!technicianId && technicians.length) setTechnicianId(technicians[0]!.id);
  }, [technicianId, technicians]);

  const params = useMemo<TechnicianEarningsParams>(() => ({
    date: period === "DAY" ? date : undefined,
    includeRemoved: includeRemoved || undefined,
    month: period === "MONTH" ? selectedMonth : period === "YEAR" ? `${selectedMonth.slice(0, 4)}-01` : undefined,
    period,
    technicianId: technicianId || undefined,
  }), [date, includeRemoved, period, selectedMonth, technicianId]);
  const earnings = useManagerTechnicianEarnings(params, canEarnings && !!technicianId);
  const rates = useTechnicianRates(technicianId || undefined, canRates && !!technicianId);
  const operations = useTechnicianOperations({ isActive: true, page: 1, pageSize: 100, sortBy: "name", sortDirection: "asc" }, canRates);
  const paymentMutation = useCreateTechnicianPayment();
  const rateMutation = useSetTechnicianRate();
  const fail = (title: string) => (error: unknown) => toast.showToast({ message: getErrorMessage(error), title, variant: "error" });

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
      toast.showToast({ message: "Alege manopera și introdu o rată validă.", title: "Rata nu a fost salvată", variant: "error" });
      return;
    }
    rateMutation.mutate({ currency: "RON", effectiveFrom: `${effectiveFrom}T00:00:00.000Z`, operationId, rateMinor: parsed.value, technicianId }, {
      onError: fail("Rata nu a fost salvată"),
      onSuccess: () => {
        setRateOpen(false);
        toast.showToast({ message: "Rata viitoare a fost salvată. Valorile deja realizate rămân neschimbate.", variant: "success" });
      },
    });
  }

  if (permissions.isLoading) return <Frame><LoadingState text="Se încarcă tehnicienii" /></Frame>;
  if (!canEarnings) return <Frame><ErrorState description="Contul curent nu are acces la valoarea realizată de tehnicieni." title="Acces refuzat" /></Frame>;

  return (
    <main className="manager-technicians">
      <section className="dl-container manager-technicians__layout">
        <header className="manager-technicians__header">
          <div>
            <p className="manager-technicians__eyebrow">Management echipă</p>
            <h1>Tehnicieni</h1>
            <p>Administrează ratele, valoarea realizată și plățile echipei tehnice.</p>
          </div>
        </header>
        <div className="manager-technicians__workspace">
          <aside className="manager-technicians__master">
            <div className="manager-technicians__master-heading"><strong>Tehnicieni</strong><span>{technicians.length} înregistrări</span></div>
            <TextInput label="Caută tehnician" onChange={(event) => setSearch(event.target.value)} placeholder="Nume sau e-mail" type="search" value={search} />
            <div className="manager-technicians__technician-list">
              {matchingTechnicians.map((item) => <button aria-pressed={technicianId === item.id} className={`manager-technicians__technician${technicianId === item.id ? " manager-technicians__technician--selected" : ""}`} key={item.id} onClick={() => setTechnicianId(item.id)} type="button"><span className="manager-technicians__avatar">{initials(item.displayName)}</span><span><strong>{item.displayName}</strong><small>{item.isActive ? "Activ" : "Inactiv"}</small></span></button>)}
              {!techniciansQuery.isLoading && !matchingTechnicians.length ? <Empty text="Nu există tehnicieni potriviți." /> : null}
            </div>
          </aside>
          <section className="manager-technicians__detail">
            {!selected ? <div className="manager-technicians__empty-selection"><span>T</span><h2>Selectează un tehnician</h2><p>Ratele, valoarea realizată, plățile și istoricul apar aici.</p></div> : <>
              <header className="manager-technicians__detail-header"><span className="manager-technicians__avatar manager-technicians__avatar--large">{initials(selected.displayName)}</span><div><div className="manager-technicians__detail-title"><h2>{selected.displayName}</h2><b className={selected.isActive ? "manager-technicians__status manager-technicians__status--active" : "manager-technicians__status"}>{selected.isActive ? "Activ" : "Inactiv"}</b></div><p>{selected.email}</p></div></header>
              <nav aria-label="Secțiuni tehnician" className="manager-technicians__tabs" role="tablist">{([{ id: "RATES", label: "Rate manopere" }, { id: "VALUE", label: "Valoare" }, { id: "PAYMENTS", label: "Plăți" }, { id: "HISTORY", label: "Istoric" }] as const).map((item) => <button aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)} role="tab" type="button">{item.label}</button>)}</nav>
              {tab !== "RATES" ? <div className="manager-technicians__period"><EarningsFilters date={date} month={selectedMonth} onDateChange={setDate} onMonthChange={setSelectedMonth} onPeriodChange={setPeriod} period={period} />{tab !== "PAYMENTS" ? <label className="manager-technicians__removed"><input checked={includeRemoved} onChange={(event) => setIncludeRemoved(event.target.checked)} type="checkbox" /> Include manopere eliminate</label> : null}</div> : null}
              {tab === "RATES" ? <Rates data={rates.data ?? []} error={rates.isError ? getErrorMessage(rates.error) : undefined} loading={rates.isLoading} manage={canManageRates} onAdd={() => { setOperationId(""); setRateAmount(""); setEffectiveFrom(today()); setRateOpen(true); }} onEdit={(rate) => { setOperationId(rate.operation.id); setRateAmount((rate.rateMinor / 100).toFixed(2)); setEffectiveFrom(today()); setRateOpen(true); }} /> : null}
              {tab === "VALUE" ? <Value data={earnings.data} error={earnings.isError ? getErrorMessage(earnings.error) : undefined} loading={earnings.isLoading} /> : null}
              {tab === "PAYMENTS" ? <Payments canPay={canPay} data={earnings.data} error={earnings.isError ? getErrorMessage(earnings.error) : undefined} loading={earnings.isLoading} open={() => { setPaymentAmount(""); setPaymentNotes(""); setPaymentDate(today()); setPaymentOpen(true); }} /> : null}
              {tab === "HISTORY" ? <History data={earnings.data} error={earnings.isError ? getErrorMessage(earnings.error) : undefined} loading={earnings.isLoading} /> : null}
            </>}
          </section>
        </div>
        <Modal description="Plata este păstrată în istoric. Soldul este verificat la data plății." isOpen={paymentOpen} onOpenChange={setPaymentOpen} title="Înregistrează plată">
          <form className="manager-technicians__modal-form" onSubmit={savePayment}><p>Tehnician: <strong>{selected?.displayName}</strong></p><div className="manager-technicians__modal-grid"><NumberInput label="Sumă (RON)" onChange={(event) => setPaymentAmount(event.target.value)} value={paymentAmount} /><DateInput label="Data plății" onChange={(event) => setPaymentDate(event.target.value)} value={paymentDate} /></div><Textarea label="Notă" onChange={(event) => setPaymentNotes(event.target.value)} placeholder="Opțional" rows={3} value={paymentNotes} /><Actions cancel={() => setPaymentOpen(false)} disabled={paymentMutation.isPending} submit="Înregistrează plata" /></form>
        </Modal>
        <Modal description="O rată nouă se aplică doar manoperelor viitoare. Valorile deja realizate nu se modifică." isOpen={rateOpen} onOpenChange={setRateOpen} title="Configurează rată">
          <form className="manager-technicians__modal-form" onSubmit={saveRate}><Select label="Manoperă" onChange={(event) => setOperationId(event.target.value)} options={(operations.data?.items ?? []).map((item) => ({ label: `${item.name} · ${item.category}`, value: item.id }))} placeholder="Alege manopera" value={operationId} /><div className="manager-technicians__modal-grid"><NumberInput label="Câștig (RON)" onChange={(event) => setRateAmount(event.target.value)} value={rateAmount} /><DateInput label="Valabil de la" onChange={(event) => setEffectiveFrom(event.target.value)} value={effectiveFrom} /></div><Actions cancel={() => setRateOpen(false)} disabled={rateMutation.isPending || !canManageRates} submit="Salvează rata" /></form>
        </Modal>
      </section>
    </main>
  );
}

function Summary({ data }: { data: TechnicianEarningsSummary }) {
  return <div className="manager-technicians__summary">{data.currencyTotals.map((item) => <div className="manager-technicians__currency-summary" key={item.currency}><div><span>Valoare realizată în perioadă</span><strong>{formatMoneyMinor(item.periodEarnedMinor, item.currency)}</strong></div><div><span>Plătit în perioadă</span><strong>{formatMoneyMinor(item.periodPaidMinor, item.currency)}</strong></div><div><span>Sold total de plată</span><strong className={item.balanceMinor < 0 ? "manager-technicians__negative" : ""}>{formatMoneyMinor(item.balanceMinor, item.currency)}</strong></div></div>)}</div>;
}

function Value({ data, error, loading }: { data: TechnicianEarningsSummary | undefined; error: string | undefined; loading: boolean }) {
  if (loading) return <LoadingState text="Se încarcă valoarea realizată" />;
  if (error) return <ErrorState description={error} title="Valoarea nu poate fi încărcată" />;
  if (!data) return null;
  const rows = data.works.flatMap((work) => work.operations.filter((operation) => !operation.removedAt).map((operation) => ({ ...operation, patient: work.patientName, work: work.workCode })));
  return <div className="manager-technicians__tab-content"><Summary data={data} /><Card><CardHeader><CardTitle>Valoare realizată</CardTitle><CardDescription>Valorile sunt calculate folosind tariful valabil la data efectuării.</CardDescription></CardHeader><CardContent>{!rows.length ? <Empty text="Nu există manopere realizate în perioada selectată." /> : <Table headers={["Lucrare", "Manoperă", "Data", "Valoare"]} rows={rows.map((row) => [<><strong>{row.work}</strong><small>{row.patient}</small></>, row.operation.name, dateTime(row.performedAt), <strong>{formatMoneyMinor(row.earningMinor, row.currency)}</strong>])} />}</CardContent></Card></div>;
}

function Payments({ canPay, data, error, loading, open }: { canPay: boolean; data: TechnicianEarningsSummary | undefined; error: string | undefined; loading: boolean; open: () => void }) {
  if (loading) return <LoadingState text="Se încarcă plățile" />;
  if (error) return <ErrorState description={error} title="Plățile nu pot fi încărcate" />;
  if (!data) return null;
  return <div className="manager-technicians__tab-content"><div className="manager-technicians__tab-toolbar"><div><h3>Situația plăților</h3><p>Vezi plățile înregistrate și soldul rămas de achitat.</p></div>{canPay ? <Button onClick={open} type="button">Înregistrează plată</Button> : null}</div><Summary data={data} /><Card><CardContent>{!data.payments.length ? <Empty text="Nu există plăți înregistrate în perioada selectată." /> : <Table headers={["Data", "Sumă", "Monedă", "Notă", "Înregistrat de"]} rows={data.payments.map((item) => [dateTime(item.paidAt), <strong>{formatMoneyMinor(item.amountMinor, item.currency)}</strong>, item.currency, item.notes || "—", item.createdByDisplayName ?? "Utilizator autorizat"])} />}</CardContent></Card></div>;
}

function History({ data, error, loading }: { data: TechnicianEarningsSummary | undefined; error: string | undefined; loading: boolean }) {
  if (loading) return <LoadingState text="Se încarcă istoricul" />;
  if (error) return <ErrorState description={error} title="Istoricul nu poate fi încărcat" />;
  if (!data) return null;
  const entries = [...data.works.flatMap((work) => work.operations.filter((operation) => !operation.removedAt).map((operation) => ({ amount: operation.earningMinor, at: operation.performedAt, currency: operation.currency, detail: `${work.workCode} · ${operation.operation.name}`, id: operation.performedOperationId, kind: "earning" as const }))), ...data.payments.map((payment) => ({ amount: payment.amountMinor, at: payment.paidAt, currency: payment.currency, detail: payment.notes || `Înregistrată de ${payment.createdByDisplayName ?? "utilizator autorizat"}`, id: payment.id, kind: "payment" as const }))].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const groups = new Map<string, typeof entries>();
  entries.forEach((entry) => { const key = entry.at.slice(0, 10); groups.set(key, [...(groups.get(key) ?? []), entry]); });
  return <Card><CardHeader><CardTitle>Istoric financiar</CardTitle><CardDescription>Valori și plăți reale, în ordine cronologică.</CardDescription></CardHeader><CardContent>{!entries.length ? <Empty text="Nu există evenimente financiare în perioada selectată." /> : <div className="manager-technicians__timeline">{[...groups].map(([day, values]) => <section key={day}><h3>{dateOnly(`${day}T12:00:00.000Z`)}</h3>{values.map((entry) => <div className={`manager-technicians__timeline-event manager-technicians__timeline-event--${entry.kind}`} key={`${entry.kind}-${entry.id}`}><span /><div><strong>{entry.kind === "earning" ? "Valoare realizată" : "Plată"}</strong><p>{entry.detail}</p></div><b>{entry.kind === "earning" ? "+" : "−"}{formatMoneyMinor(entry.amount, entry.currency)}</b></div>)}</section>)}</div>}</CardContent></Card>;
}

function Rates({ data, error, loading, manage, onAdd, onEdit }: { data: readonly { id: string; currency: string; effectiveFrom: string; operation: { category: string; id: string; name: string }; rateMinor: number }[]; error: string | undefined; loading: boolean; manage: boolean; onAdd: () => void; onEdit: (item: { operation: { id: string }; rateMinor: number }) => void }) {
  return <div className="manager-technicians__tab-content"><div className="manager-technicians__tab-toolbar"><div><h3>Rate manopere</h3><p>Actualizarea creează o rată nouă pentru viitor; istoricul valorilor rămâne neschimbat.</p></div>{manage ? <Button onClick={onAdd} type="button">Adaugă rată</Button> : null}</div>{loading ? <LoadingState text="Se încarcă ratele" /> : error ? <ErrorState description={error} title="Ratele nu pot fi încărcate" /> : <Card><CardContent>{!data.length ? <Empty text="Nu există rate pentru tehnicianul selectat." /> : <div className="manager-technicians__rate-list">{data.map((item) => <div className="manager-technicians__rate-row" key={item.id}><span><strong>{item.operation.name}</strong><small>{item.operation.category} · De la {dateOnly(item.effectiveFrom)}</small></span><strong>{formatMoneyMinor(item.rateMinor, item.currency)}</strong>{manage ? <Button onClick={() => onEdit(item)} size="small" type="button" variant="outline">Actualizează</Button> : null}</div>)}</div>}</CardContent></Card>}</div>;
}

function Table({ headers, rows }: { headers: readonly string[]; rows: readonly (readonly ReactNode[])[] }) { return <div className="manager-technicians__table-wrap"><table className="manager-technicians__ledger-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td data-label={headers[cellIndex]} key={headers[cellIndex]}>{cell}</td>)}</tr>)}</tbody></table></div>; }
function Actions({ cancel, disabled, submit }: { cancel: () => void; disabled: boolean; submit: string }) { return <div className="manager-technicians__actions"><Button onClick={cancel} type="button" variant="outline">Renunță</Button><Button disabled={disabled} type="submit">{submit}</Button></div>; }
function Empty({ text }: { text: string }) { return <p className="manager-technicians__empty-data">{text}</p>; }
function Frame({ children }: { children: ReactNode }) { return <main className="manager-technicians"><section className="dl-container">{children}</section></main>; }
