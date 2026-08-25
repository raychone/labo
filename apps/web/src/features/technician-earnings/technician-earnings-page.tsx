import { Card, CardContent, CardDescription, CardHeader, CardTitle, DateInput, ErrorState, LoadingState, Select } from "@dental-lab/ui";
import { ADULT_FDI_TEETH, formatMoneyMinor, type TechnicianEarningsParams, type TechnicianEarningsSummary, type TechnicianEarningsWorkBreakdown } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";

import { fetchPermissions } from "../auth/auth-api.js";
import { useOwnTechnicianEarnings } from "../pricing/technician-operations-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./technician-earnings-page.css";

type EarningsPeriod = "DAY" | "MONTH" | "YEAR";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function TechnicianEarningsPage(): ReactNode {
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadOwnEarnings = hasPermission(permissionsQuery.data, "technician.earnings.read_own");
  const [period, setPeriod] = useState<EarningsPeriod>("DAY");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(currentMonth());
  const params = useMemo<TechnicianEarningsParams>(() => ({
    date: period === "DAY" ? date : undefined,
    month: period === "YEAR" ? `${month.slice(0, 4)}-01` : period === "MONTH" ? month : undefined,
    period,
  }), [date, month, period]);
  const earningsQuery = useOwnTechnicianEarnings(params, canReadOwnEarnings);

  if (permissionsQuery.isLoading) {
    return <PageFrame><LoadingState text="Se încarcă câștigurile" /></PageFrame>;
  }

  if (!canReadOwnEarnings) {
    return <PageFrame><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea technician.earnings.read_own." /></PageFrame>;
  }

  return (
    <main className="technician-earnings">
      <section className="dl-container technician-earnings__layout" aria-labelledby="earnings-title">
        <header className="technician-earnings__header">
          <div>
            <h1 id="earnings-title">Valoare</h1>
            <p>Manoperele finalizate generează o sumă de primit. Plata apare doar după ce Managerul o înregistrează.</p>
          </div>
        </header>

        <EarningsFilters date={date} month={month} onDateChange={setDate} onMonthChange={setMonth} onPeriodChange={setPeriod} period={period} />
        <EarningsContent data={earningsQuery.data} error={earningsQuery.isError ? getErrorMessage(earningsQuery.error) : undefined} isLoading={earningsQuery.isLoading} paymentPerspective="technician" />
      </section>
    </main>
  );
}

export function EarningsFilters({
  date,
  month,
  onDateChange,
  onMonthChange,
  onPeriodChange,
  period,
}: {
  readonly date: string;
  readonly month: string;
  readonly onDateChange: (value: string) => void;
  readonly onMonthChange: (value: string) => void;
  readonly onPeriodChange: (value: EarningsPeriod) => void;
  readonly period: EarningsPeriod;
}): ReactNode {
  return (
    <Card>
      <CardContent className="technician-earnings__filters">
        <Select
          label="Perioadă"
          onChange={(event) => onPeriodChange(event.target.value as EarningsPeriod)}
          options={[
            { label: "Zi", value: "DAY" },
            { label: "Lună", value: "MONTH" },
            { label: "An", value: "YEAR" },
          ]}
          value={period}
        />
        {period === "DAY" ? (
          <DateInput label="Zi" onChange={(event) => onDateChange(event.target.value)} value={date} />
        ) : (
          <label className="technician-earnings__field">
            <span>{period === "YEAR" ? "An" : "Lună"}</span>
            <input onChange={(event) => onMonthChange(event.target.value)} type={period === "YEAR" ? "number" : "month"} value={period === "YEAR" ? month.slice(0, 4) : month} />
          </label>
        )}
      </CardContent>
    </Card>
  );
}

export function EarningsContent({
  data,
  error,
  isLoading,
  paymentPerspective = "technician",
}: {
  readonly data: TechnicianEarningsSummary | undefined;
  readonly error: string | undefined;
  readonly isLoading: boolean;
  readonly paymentPerspective?: "manager" | "technician";
}): ReactNode {
  if (isLoading) {
    return <LoadingState text="Se calculează câștigurile" />;
  }

  if (error) {
    return <ErrorState title="Valoarea nu poate fi încărcată" description={error} />;
  }

  if (!data) {
    return null;
  }

  const works = data.works ?? [];
  const payments = data.payments ?? [];
  const paidMinor = data.paidMinor ?? 0;
  const remainingMinor = data.remainingMinor ?? data.totalMinor - paidMinor;
  const currencyTotals = data.currencyTotals ?? [{ currency: data.currency, periodEarnedMinor: data.totalMinor, periodPaidMinor: paidMinor, cumulativeEarnedMinor: data.totalMinor, cumulativePaidMinor: paidMinor, balanceMinor: remainingMinor, settlementStatus: "UNPAID" as const, totalMinor: data.totalMinor, paidMinor, remainingMinor }];
  const formatTotals = (key: "periodEarnedMinor" | "periodPaidMinor" | "balanceMinor") => currencyTotals.map((item) => `${formatMoneyMinor(item[key], item.currency)}`).join(" · ");
  const hasOverpayment = currencyTotals.some((item) => item.balanceMinor < 0);

  return (
    <>
      <div className="technician-earnings__summary">
        <Card>
          <CardHeader>
            <CardTitle>{formatTotals("periodEarnedMinor")}</CardTitle>
            <CardDescription>Câștigat în perioadă</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{formatTotals("periodPaidMinor")}</CardTitle>
            <CardDescription>{paymentPerspective === "manager" ? "Plătit în perioadă" : "Primit în perioadă"}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{formatTotals("balanceMinor")}</CardTitle>
            <CardDescription>{hasOverpayment ? "Plătit în plus" : paymentPerspective === "manager" ? "Sold de plată" : "De primit"}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{works.length}</CardTitle>
            <CardDescription>Lucrări cu manopere</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Detaliu pe lucrări</CardTitle>
          <CardDescription>Valorile sunt snapshots istorice din manoperele efectuate.</CardDescription>
        </CardHeader>
        <CardContent>
          {works.length === 0 ? <p className="technician-earnings__muted">Nu există câștiguri în perioada selectată.</p> : <EarningsBreakdown showTechnician={paymentPerspective === "manager" && data.technician === null} works={works} />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{paymentPerspective === "manager" ? "Achitări către tehnician" : "Achitări primite"}</CardTitle><CardDescription>{paymentPerspective === "manager" ? "Înregistrate pentru tehnicianul selectat." : "Înregistrate în istoricul câștigurilor."}</CardDescription></CardHeader>
        <CardContent>{payments.length === 0 ? <p className="technician-earnings__muted">Nu există plăți înregistrate.</p> : payments.map((payment) => <div className="technician-earnings__payment" key={payment.id}><strong>{formatMoneyMinor(payment.amountMinor, payment.currency)}</strong><span>{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(payment.paidAt))}</span><span>{payment.notes ?? ""}</span></div>)}</CardContent>
      </Card>
    </>
  );
}

function EarningsBreakdown({ showTechnician, works }: { readonly showTechnician: boolean; readonly works: readonly TechnicianEarningsWorkBreakdown[] }): ReactNode {
  return (
    <div className="technician-earnings__work-list">
      {works.map((work) => (
        <section className="technician-earnings__work" key={work.workOrderId}>
          <div className="technician-earnings__work-header">
            <div>
              <strong>{work.workCode}</strong>
              <span>{work.patientName}</span>
            </div>
            <strong>{formatMoneyMinor(work.totalMinor, work.currency)}</strong>
          </div>
          <table className="technician-earnings__table">
            <thead>
              <tr>
                <th>Manoperă</th>
                <th>Performare</th>
                <th>Câștig snapshot</th>
              </tr>
            </thead>
            <tbody>
              {work.operations.map((operation) => (
                <tr key={operation.performedOperationId}>
                  <td data-label="Manoperă">
                    {operation.operation.code} · {operation.operation.name}
                    {operation.isLegacy ? <small> · istoric, fără scop tarifar disponibil</small> : operation.quantity !== null && operation.rateMinorSnapshot !== null ? <small> · {operation.quantity} × {formatMoneyMinor(operation.rateMinorSnapshot, operation.currency)}</small> : null}
                    {(operation.selectedTeeth ?? []).length > 0 ? <small> · FDI {(operation.selectedTeeth ?? []).slice().sort((a, b) => ADULT_FDI_TEETH.indexOf(a as never) - ADULT_FDI_TEETH.indexOf(b as never)).join(", ")}</small> : null}
                    {operation.probeCycle ? <small> · Proba {operation.probeCycle.sequence}</small> : null}
                    {showTechnician && operation.technician ? <small> · {operation.technician.displayName}</small> : null}
                    {operation.removedAt ? <small> · Eliminată{operation.removalReason ? `: ${operation.removalReason}` : ""}</small> : null}
                  </td>
                  <td data-label="Performare">{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(operation.performedAt))}</td>
                  <td data-label="Câștig">{formatMoneyMinor(operation.earningMinor, operation.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="technician-earnings"><section className="dl-container">{children}</section></main>;
}
