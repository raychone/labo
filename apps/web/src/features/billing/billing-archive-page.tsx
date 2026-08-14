import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, LoadingState, Select, StatusBadge } from "@dental-lab/ui";
import { formatMoneyMinor, type MonthCloseArchiveSummary, type MonthEndRegistry } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useMemo, type ReactNode } from "react";

import { fetchMonthRegistryArchives, fetchMonthRegistry, downloadMonthRegistryCsv } from "./billing-api.js";
import { useSettings } from "../settings/settings-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { MonthRegistryReportView } from "./billing-month-registry-print-page.js";
import "./billing-page.css";

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    label: new Intl.DateTimeFormat("ro-RO", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, index, 1))),
    month,
  };
});

function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1]?.label ?? String(month);
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function isValidYearMonth(year: string | undefined, month: string | undefined): boolean {
  if (year === undefined || month === undefined) {
    return false;
  }

  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  return Number.isInteger(parsedYear) && Number.isInteger(parsedMonth) && parsedYear >= 2000 && parsedYear <= 2100 && parsedMonth >= 1 && parsedMonth <= 12;
}

function currentYear(now = new Date()): number {
  return now.getFullYear();
}

function downloadName(year: number, month: number): string {
  return `arhiva-facturare-${year}-${String(month).padStart(2, "0")}.csv`;
}

export function BillingArchivePage(): ReactNode {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsQuery = useSettings(true);
  const archivesQuery = useQuery<{ readonly items: readonly MonthCloseArchiveSummary[] }>({
    enabled: Boolean(settingsQuery.data?.legalEntityCode),
    queryFn: fetchMonthRegistryArchives,
    queryKey: ["billing", "month-registry", "archives", settingsQuery.data?.legalEntityCode ?? "loading"],
    retry: false,
  });

  const companyLabel = settingsQuery.data ? `${settingsQuery.data.legalEntityCode} — ${settingsQuery.data.legalEntityDisplayName}` : "Firma activă";
  const archives = archivesQuery.data?.items ?? [];
  const archiveByYear = useMemo(() => new Map<number, MonthCloseArchiveSummary[]>(groupArchivesByYear(archives)), [archives]);
  const hasDetailRoute = isValidYearMonth(params.year, params.month);
  const detailYear = hasDetailRoute ? Number(params.year) : null;
  const detailMonth = hasDetailRoute ? Number(params.month) : null;
  const detailRegistryQuery = useQuery<MonthEndRegistry>({
    enabled: hasDetailRoute,
    queryFn: () => fetchMonthRegistry({ month: detailMonth ?? 0, year: detailYear ?? 0 }),
    queryKey: ["billing", "archive", "detail", detailYear ?? "invalid", detailMonth ?? "invalid", settingsQuery.data?.legalEntityCode ?? "loading"],
    retry: false,
  });

  function updateYear(year: number): void {
    const next = new URLSearchParams(searchParams);
    next.set("year", String(year));
    next.delete("month");
    setSearchParams(next, { replace: true });
  }

  if (settingsQuery.isLoading || archivesQuery.isLoading) {
    return <main className="billing-archive-page"><LoadingState text="Se încarcă arhiva facturare" /></main>;
  }

  if (settingsQuery.error || archivesQuery.error || !settingsQuery.data || !archivesQuery.data) {
    return (
      <main className="billing-archive-page">
        <ErrorState title="Arhiva facturare nu poate fi încărcată" description={getErrorMessage(archivesQuery.error ?? settingsQuery.error)} />
      </main>
    );
  }

  if (hasDetailRoute) {
    const year = detailYear ?? currentYear();
    const month = detailMonth ?? 1;
    const archive = archives.find((item) => item.year === year && item.month === month);

    if (!archive) {
      return (
        <main className="billing-archive-page">
          <div className="billing-archive-page__header">
            <div>
              <h1>Arhivă facturare</h1>
              <p>Lunile financiare închise și documentele istorice ale firmei active.</p>
            </div>
            <div className="billing-archive-page__company">
              <span>Firma activă</span>
              <strong>{companyLabel}</strong>
            </div>
          </div>
          <EmptyState
            action={<Button onClick={() => navigate("/billing/archive")} variant="outline">Înapoi la arhivă</Button>}
            description={`Luna ${monthLabel(month)} ${year} nu este arhivată pentru compania activă.`}
            title="Arhivă inexistentă"
          />
        </main>
      );
    }

    return (
      <main className="billing-archive-page billing-archive-page--detail">
        <div className="billing-archive-page__toolbar">
          <Button onClick={() => navigate("/billing/archive")} variant="outline">Înapoi la arhivă</Button>
          <Button
            onClick={() => window.open(`/billing/month-registry/print?year=${year}&month=${month}`, "_blank", "noopener,noreferrer")}
            variant="secondary"
          >
            PDF
          </Button>
          <Button
            onClick={async () => {
              const csv = await downloadMonthRegistryCsv({ month, year });
              downloadCsv(downloadName(year, month), csv);
            }}
            variant="outline"
          >
            CSV
          </Button>
        </div>

        <section className="billing-archive-page__detail-shell">
          <header className="billing-archive-page__header billing-archive-page__header--detail">
            <div>
              <h1>Arhivă facturare</h1>
              <p>Lunile financiare închise și documentele istorice ale firmei active.</p>
            </div>
            <div className="billing-archive-page__company">
              <span>Firma activă</span>
              <strong>{companyLabel}</strong>
            </div>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>
                {monthLabel(month)} {year}
              </CardTitle>
              <CardDescription>
                <StatusBadge label="Snapshot arhivat" variant="closed" />
                <span> Închis la {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(archive.closedAt))}</span>
                <span> · Închis de {archive.closedByDisplayName ?? archive.closedByEmail ?? "Necunoscut"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="billing-archive-page__summary">
                <span>Total emis: {formatMoneyMinor(archive.totalMinor, archive.currency, settingsQuery.data.locale)}</span>
                <span>Încasat: {formatMoneyMinor(archive.paidMinor, archive.currency, settingsQuery.data.locale)}</span>
                <span>Neachitat: {formatMoneyMinor(archive.unpaidTotalMinor, archive.currency, settingsQuery.data.locale)}</span>
                <span>Parțial: {formatMoneyMinor(archive.partialTotalMinor, archive.currency, settingsQuery.data.locale)}</span>
                <span>Achitat: {formatMoneyMinor(archive.paidTotalMinor, archive.currency, settingsQuery.data.locale)}</span>
              </div>
            </CardContent>
          </Card>

          {detailRegistryQuery.isLoading ? <LoadingState text="Se încarcă snapshot-ul arhivat" /> : null}
          {detailRegistryQuery.isError ? <ErrorState title="Snapshot-ul arhivat nu poate fi încărcat" description={getErrorMessage(detailRegistryQuery.error)} /> : null}
          {detailRegistryQuery.data ? <MonthRegistryReportView companyLabel={companyLabel} registry={detailRegistryQuery.data} /> : null}
        </section>
      </main>
    );
  }

  const selectedYear = resolveSelectedYear(searchParams, currentYear());
  const availableYears = resolveArchiveYears(archives, selectedYear);
  const monthsForYear = archiveByYear.get(selectedYear) ?? [];
  const archiveMap = new Map(monthsForYear.map((archive) => [archive.month, archive] as const));

  return (
    <main className="billing-archive-page">
      <div className="billing-archive-page__header">
        <div>
          <h1>Arhivă facturare</h1>
          <p>Lunile financiare închise și documentele istorice ale firmei active.</p>
        </div>
        <div className="billing-archive-page__company">
          <span>Firma activă</span>
          <strong>{companyLabel}</strong>
          <small>{archives.length === 1 ? "1 lună arhivată pentru compania activă." : `${archives.length} luni arhivate pentru compania activă.`}</small>
        </div>
      </div>

      <div className="billing-archive-page__toolbar">
        <Button disabled={selectedYear <= Math.min(...availableYears)} onClick={() => updateYear(selectedYear - 1)} variant="outline">‹</Button>
        <Button onClick={() => updateYear(currentYear())} variant="secondary">Anul curent</Button>
        <Select
          label="An"
          options={availableYears.map((year) => ({ label: String(year), value: String(year) }))}
          value={String(selectedYear)}
          onChange={(event) => updateYear(Number(event.target.value))}
        />
        <Button disabled={selectedYear >= Math.max(...availableYears)} onClick={() => updateYear(selectedYear + 1)} variant="outline">›</Button>
      </div>

      {monthsForYear.length === 0 ? (
        <EmptyState
          action={<Button onClick={() => updateYear(currentYear())} variant="outline">Alege anul curent</Button>}
          description={`Nu există luni închise pentru ${selectedYear}.`}
          title="Nu există arhive pentru anul selectat"
        />
      ) : (
        <section className="billing-archive-page__month-grid" aria-label={`Arhivă ${selectedYear}`}>
          {Array.from({ length: 12 }, (_, index) => 12 - index).map((month) => {
            const archive = archiveMap.get(month);
            return (
              <Card className="billing-archive-page__month-card" key={`${selectedYear}-${month}`}>
                <CardHeader>
                  <CardTitle>{monthLabel(month)} {selectedYear}</CardTitle>
                  <CardDescription>
                    {archive ? (
                      <StatusBadge label="Închisă" variant="closed" />
                    ) : (
                      <StatusBadge label="Neînchisă" variant="draft" />
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {archive ? (
                    <div className="billing-archive-page__month-meta">
                      <span>Închis la {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(archive.closedAt))}</span>
                      <span>Închis de {archive.closedByDisplayName ?? archive.closedByEmail ?? "Necunoscut"}</span>
                      <span>Total: {formatMoneyMinor(archive.totalMinor, archive.currency, settingsQuery.data.locale)}</span>
                      <span>Încasat: {formatMoneyMinor(archive.paidMinor, archive.currency, settingsQuery.data.locale)}</span>
                      <span>Neachitat: {formatMoneyMinor(archive.unpaidTotalMinor, archive.currency, settingsQuery.data.locale)}</span>
                    </div>
                  ) : (
                    <EmptyState description="Neînchisă" title="Luna nu are snapshot arhivat" />
                  )}

                  <div className="billing-archive-page__toolbar billing-archive-page__toolbar--compact">
                    {archive ? (
                      <>
                        <Button onClick={() => navigate(`/billing/archive/${archive.year}/${archive.month}`)} variant="secondary">Deschide</Button>
                        <Button onClick={() => window.open(`/billing/month-registry/print?year=${archive.year}&month=${archive.month}`, "_blank", "noopener,noreferrer")} variant="outline">
                          PDF
                        </Button>
                        <Button
                          onClick={async () => {
                            const csv = await downloadMonthRegistryCsv({ month: archive.month, year: archive.year });
                            downloadCsv(downloadName(archive.year, archive.month), csv);
                          }}
                          variant="outline"
                        >
                          CSV
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => navigate(`/billing?year=${selectedYear}&month=${month}`)} variant="outline">Du-te la facturare</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <div className="billing-archive-page__footer-link">
        <Link to="/billing">Înapoi la facturare</Link>
      </div>
    </main>
  );
}

function resolveArchiveYears(archives: readonly MonthCloseArchiveSummary[], selectedYear: number): number[] {
  const years = new Set<number>([selectedYear, currentYear(), currentYear() - 1, currentYear() + 1]);
  for (const archive of archives) {
    years.add(archive.year);
  }
  return Array.from(years).sort((left, right) => left - right);
}

function resolveSelectedYear(searchParams: URLSearchParams, fallbackYear: number): number {
  const queryYear = Number(searchParams.get("year"));
  if (Number.isInteger(queryYear) && queryYear >= 2000 && queryYear <= 2100) {
    return queryYear;
  }

  return fallbackYear;
}

function groupArchivesByYear(archives: readonly MonthCloseArchiveSummary[]): Array<[number, MonthCloseArchiveSummary[]]> {
  const groups = new Map<number, MonthCloseArchiveSummary[]>();
  for (const archive of archives) {
    const current = groups.get(archive.year) ?? [];
    current.push(archive);
    groups.set(archive.year, current);
  }
  return Array.from(groups.entries()).map(([year, items]) => [year, items.sort((left, right) => right.month - left.month)] as const);
}
