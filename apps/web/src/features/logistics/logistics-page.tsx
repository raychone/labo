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
  FormActions,
  Modal,
  Select,
  StatusBadge,
  TextInput,
  Textarea,
  useToast,
} from "@dental-lab/ui";
import {
  LOGISTICS_STATUS_LABELS,
  PICKUP_REQUEST_STATUS_LABELS,
  FINAL_WORK_STATUSES,
  type CreatePickupRequestInput,
  type LogisticsCenterCategory,
  type LogisticsCenterItem,
  type LogisticsCenterQuery,
  type PickupRequestView,
  type UpdatePickupRequestInput,
} from "@dental-lab/shared";
import { LOGISTICS_MARKERS, type LogisticsMarker } from "@dental-lab/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect, useId, useMemo, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { fetchClinic, fetchClinicOptions, fetchDoctorOptions } from "../clinics/clinics-api.js";
import { usePatientOptions } from "../patients/patients-api.js";
import { fetchUsers, hasPermission } from "../users/users-api.js";
import { useTechnicianOptions } from "../technician-workbench/technician-workbench-api.js";
import { WorkForm, defaultWorkFormValues, toWorkDeadlinePreviewInput, toWorkMutationInput } from "../works/work-form.js";
import { useActiveWorkFormTemplate } from "../work-forms/work-form-templates-api.js";
import { setWorkStatus, useReworkProbe, useWorkDeadlinePreview, useWorkFormWorkTypeOptions } from "../works/works-api.js";
import { workFormSchema, type WorkFormValues } from "../works/works-page.schema.js";
import {
  useCreateLogisticsWork,
  useCourierRoutes,
  useCancelPickupRequest,
  useCreatePickupRequest,
  useLogisticsCenter,
  useLogisticsSummary,
  useFastDelegateLogisticsWork,
  useUpdateLogisticsWorkActions,
  usePickupRequests,
  type PickupRequestsQuery,
  useUpdatePickupRequest,
} from "./logistics-api.js";
import { applyApiErrorsToForm, getErrorMessage, UnsavedChangesPrompt, useBeforeUnloadPrompt, useCloseGuard } from "../../lib/form-utils.js";
import "./logistics-page.css";

const defaultQuery: LogisticsCenterQuery = {
  category: "ALL",
  page: 1,
  pageSize: 30,
  sortBy: "requestedDeliveryDate",
  sortDirection: "asc",
};

const attachmentLimits = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxFileBytes: 5 * 1024 * 1024,
  maxFiles: 8,
  maxTotalBytes: 20 * 1024 * 1024,
} as const;

const pickupFormSchema = z.object({
  address: z.string().trim().max(300, "Adresa poate avea maximum 300 de caractere."),
  clinicId: z.string().min(1, "Alege clinica."),
  doctorId: z.string(),
  exactTime: z.string(),
  notes: z.string().trim().max(1000, "Notele pot avea maximum 1000 de caractere."),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Alege data."),
  scheduleType: z.enum(["EXACT", "RANGE"]),
  windowEndTime: z.string(),
  windowStartTime: z.string(),
  phone: z.string().trim().max(40, "Telefonul poate avea maximum 40 de caractere."),
}).superRefine((values, context) => {
  if (values.scheduleType === "EXACT") {
    if (!isTimeValue(values.exactTime)) {
      context.addIssue({ code: "custom", message: "Ora exactă este obligatorie.", path: ["exactTime"] });
    }
    if (values.windowStartTime !== "" || values.windowEndTime !== "") {
      context.addIssue({ code: "custom", message: "Pentru ora exactă nu completa interval.", path: ["windowStartTime"] });
    }
    return;
  }
  if (!isTimeValue(values.windowStartTime)) {
    context.addIssue({ code: "custom", message: "Ora de început este obligatorie.", path: ["windowStartTime"] });
  }
  if (!isTimeValue(values.windowEndTime)) {
    context.addIssue({ code: "custom", message: "Ora de final este obligatorie.", path: ["windowEndTime"] });
  }
  if (isTimeValue(values.windowStartTime) && isTimeValue(values.windowEndTime) && values.windowStartTime >= values.windowEndTime) {
    context.addIssue({ code: "custom", message: "Intervalul trebuie să înceapă înainte de final.", path: ["windowEndTime"] });
  }
  if (values.exactTime !== "") {
    context.addIssue({ code: "custom", message: "Pentru interval nu completa ora exactă.", path: ["exactTime"] });
  }
});

type PickupFormValues = z.infer<typeof pickupFormSchema>;

const defaultPickupFormValues: PickupFormValues = {
  address: "",
  clinicId: "",
  doctorId: "",
  exactTime: "",
  notes: "",
  scheduledDate: "",
  scheduleType: "RANGE",
  windowEndTime: "",
  windowStartTime: "",
  phone: "",
};

function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value)) : "-";
}

function isTimeValue(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const parts = value.split(":").map(Number);
  const hour = parts[0];
  const minute = parts[1];
  if (hour === undefined || minute === undefined) {
    return false;
  }
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isWithinDays(value: string, days: 1 | 2 | 3): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const difference = Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
  return difference >= 0 && difference <= days;
}

function isReadyForLogisticsRoute(item: LogisticsCenterItem): boolean {
  return item.requiresDelivery
    || item.requiresPickup
    || item.logisticsActionReasons.includes("READY_FOR_PROBE_DELIVERY")
    || item.logisticsActionReasons.includes("READY_FOR_FINAL_DELIVERY");
}

export function LogisticsPage(): ReactNode {
  const navigate = useNavigate();
  const toast = useToast();
  const [query, setQuery] = useState<LogisticsCenterQuery>(defaultQuery);
  const [isCreateWorkOpen, setCreateWorkOpen] = useState(false);
  const [isPickupModalOpen, setPickupModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [routeQueueOnly, setRouteQueueOnly] = useState(false);
  const [editingPickup, setEditingPickup] = useState<PickupRequestView | null>(null);
  const [reworkItem, setReworkItem] = useState<LogisticsCenterItem | null>(null);
  const queryClient = useQueryClient();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "logistics.center.read");
  const canCreateWork = hasPermission(permissionsQuery.data, "works.create");
  const canUploadFiles = hasPermission(permissionsQuery.data, "files.upload");
  const canCreatePickup = hasPermission(permissionsQuery.data, "pickup.create");
  const canReadPickups = hasPermission(permissionsQuery.data, "pickup.read");
  const canUpdatePickup = hasPermission(permissionsQuery.data, "pickup.update");
  const canCancelPickup = hasPermission(permissionsQuery.data, "pickup.cancel");
  const canReadRoutes = hasPermission(permissionsQuery.data, "routes.read");
  // The delivery and pickup KPI cards open the same operational queue. The
  // row itself determines whether its next action is delivery or pickup.
  const centerQuery = useLogisticsCenter(
    routeQueueOnly
      ? { ...query, pageSize: 100 }
      : query.category === "DE_LIVRAT" || query.category === "DE_RIDICAT" ? { ...query, category: "ALL" } : query,
    canRead,
  );
  const summaryQuery = useLogisticsSummary(query, canRead);
  const clinicOptionsQuery = useQuery({ enabled: canRead, queryFn: fetchClinicOptions, queryKey: ["clinics", "options", "logistics-filters"], retry: false });
  const doctorOptionsQuery = useQuery({
    enabled: canRead,
    queryFn: () => fetchDoctorOptions(query.clinicId),
    queryKey: ["doctors", "options", "logistics-filters", query.clinicId],
    retry: false,
  });
  const techniciansQuery = useTechnicianOptions(canRead);
  const workTypeOptionsQuery = useWorkFormWorkTypeOptions(canRead);
  const receptionUsersQuery = useQuery({
    enabled: canRead,
    queryFn: () => fetchUsers({ isActive: true, page: 1, pageSize: 100, roleKey: "RECEPTIE", search: undefined, sortBy: "displayName", sortDirection: "asc" }),
    queryKey: ["users", "reception-options", "logistics"],
    retry: false,
  });
  // The operational centre is one combined queue. Delivery and pickup remain
  // distinct only by the action displayed on each row and by the route stop
  // type created when that action is clicked.
  const showPickups = canReadPickups && (query.category === "ALL" || query.category === "DE_LIVRAT" || query.category === "DE_RIDICAT");
  const pickupQuery = useMemo<PickupRequestsQuery>(() => {
    const next = {} as { -readonly [Key in keyof PickupRequestsQuery]?: PickupRequestsQuery[Key] };
    if (query.clinicId) next.clinicId = query.clinicId;
    if (query.doctorId) next.doctorId = query.doctorId;
    if (query.dateFrom) next.dateFrom = query.dateFrom;
    if (query.dateTo) next.dateTo = query.dateTo;
    if (query.exactDate) next.exactDate = query.exactDate;
    if (query.receptionUserId) next.receptionUserId = query.receptionUserId;
    if (query.pickupHorizonDays) next.pickupHorizonDays = query.pickupHorizonDays;
    return next;
  }, [query.clinicId, query.dateFrom, query.dateTo, query.doctorId, query.exactDate, query.pickupHorizonDays, query.receptionUserId]);
  const pickupsQuery = usePickupRequests(showPickups, pickupQuery);
  const updateWorkActions = useUpdateLogisticsWorkActions();
  const queueTransport = useFastDelegateLogisticsWork();
  const routesQuery = useCourierRoutes({ page: 1, pageSize: 100 }, canReadRoutes);
  const updateWorkStatus = useMutation({
    mutationFn: ({ status, workOrderId }: { readonly status: (typeof FINAL_WORK_STATUSES)[number]; readonly workOrderId: string }) => setWorkStatus(workOrderId, { status }),
    onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Starea nu a fost schimbată", variant: "error" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["logistics"] }),
        queryClient.invalidateQueries({ queryKey: ["status"] }),
      ]);
    },
  });
  const cancelPickup = useCancelPickupRequest();

  function setCategory(category: LogisticsCenterCategory): void {
    setRouteQueueOnly(false);
    setQuery((current) => {
      const { deliveryHorizonDays: _deliveryHorizonDays, pickupHorizonDays: _pickupHorizonDays, ...rest } = current;
      return { ...rest, category, page: 1 };
    });
  }

  function setRouteQueueWindow(days?: 1 | 2 | 3): void {
    setRouteQueueOnly(true);
    setQuery((current) => {
      const { deliveryHorizonDays: _deliveryHorizonDays, pickupHorizonDays: _pickupHorizonDays, ...rest } = current;
      return days === undefined
        ? { ...rest, category: "ALL", page: 1 }
        : { ...rest, category: "ALL", deliveryHorizonDays: days, pickupHorizonDays: days, page: 1 };
    });
  }

  const assignedStopKeys = useMemo(() => new Set((routesQuery.data?.items ?? [])
    .filter((route) => ["DRAFT", "ASSIGNED", "IN_PROGRESS"].includes(route.status) && !(route.status === "DRAFT" && route.courier === null && route.name === "Lista pentru viitoarele trasee"))
    .flatMap((route) => route.stops.filter((stop) => stop.outcomeStatus === "PENDING").map((stop) => `${stop.type}:${stop.workOrderId ?? stop.pickupRequestId ?? stop.id}`))), [routesQuery.data?.items]);

  const visibleRouteQueueCount = useMemo(() => {
    if (!routeQueueOnly) return null;
    const workCount = (centerQuery.data?.items ?? []).filter((item) => {
      if (!isReadyForLogisticsRoute(item)) return false;
      const horizon = query.deliveryHorizonDays;
      return (!horizon || isWithinDays(item.requestedDeliveryDate, horizon))
        && !assignedStopKeys.has(`DELIVERY:${item.id}`)
        && !assignedStopKeys.has(`PICKUP:${item.id}`);
    }).length;
    const pickupCount = (pickupsQuery.data ?? []).filter((pickup) => {
      const horizon = query.pickupHorizonDays;
      return (!horizon || isWithinDays(pickup.scheduledDate, horizon))
        && !assignedStopKeys.has(`PICKUP:${pickup.id}`);
    }).length;
    return workCount + pickupCount;
  }, [assignedStopKeys, centerQuery.data?.items, pickupsQuery.data, query.deliveryHorizonDays, query.pickupHorizonDays, routeQueueOnly]);

  function openRouteLists(operation: "DELIVERY" | "PICKUP"): void {
    setRouteQueueWindow(undefined);
    toast.showToast({ message: operation === "DELIVERY" ? "Lucrarea este disponibilă în lista De livrat." : "Lucrarea este disponibilă în lista De ridicat.", variant: "success" });
  }
  if (permissionsQuery.isLoading) {
    return <PageFrame><LoadingState text="Se încarcă permisiunile" /></PageFrame>;
  }
  if (!canRead) {
    return <PageFrame><ErrorState title="Acces refuzat" description="Contul curent nu are acces la centrul operațional." /></PageFrame>;
  }

  return (
    <main className="logistics-page">
      <section className="dl-container logistics-page__layout" aria-labelledby="logistics-title">
        <header className="logistics-page__header">
          <div>
            <h1 id="logistics-title">Centru operațional</h1>
            <p>{new Intl.DateTimeFormat("ro-RO", { dateStyle: "full" }).format(new Date())}</p>
          </div>
          <div className="logistics-page__header-actions">
            <Button onClick={() => navigate("/scan")} variant="outline">Scanează lucrare</Button>
            {canCreateWork ? <Button disabled={!canUploadFiles} onClick={() => setCreateWorkOpen(true)}>Lucrare nouă</Button> : null}
            {canCreatePickup ? <Button onClick={() => { setEditingPickup(null); setPickupModalOpen(true); }}>Ridicare nouă</Button> : null}
          </div>
        </header>

        <div className="logistics-page__summary">
          <SummaryCard active={query.category === "ALL" && !routeQueueOnly} label="Toate" onClick={() => setCategory("ALL")} value={summaryQuery.data?.all ?? 0} />
          <SummaryCard active={query.category === "INTARZIATE"} label="Întârziate" onClick={() => setCategory("INTARZIATE")} value={summaryQuery.data?.overdue ?? 0} />
          <SummaryCard active={query.category === "IN_ASTEPTARE"} label="În așteptare" onClick={() => setCategory("IN_ASTEPTARE")} value={summaryQuery.data?.waiting ?? 0} />
          <SummaryCard
            active={routeQueueOnly}
            label="De livrat / de ridicat"
            onClick={() => setRouteQueueWindow()}
            {...(query.deliveryHorizonDays ? { dayWindow: query.deliveryHorizonDays } : {})}
            onDayWindowChange={(days) => setRouteQueueWindow(days)}
            value={visibleRouteQueueCount ?? ((summaryQuery.data?.toDeliver ?? 0) + (summaryQuery.data?.toPickup ?? 0))}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="logistics-page__card-header-row">
              <div>
                <CardTitle>Lucrări operaționale</CardTitle>
              <CardDescription>Blocări, locații fizice, termene, livrări și ridicări.</CardDescription>
              </div>
              <Button onClick={() => setFiltersOpen((current) => !current)} variant="secondary">
                {filtersOpen ? "Ascunde filtrele" : "Afișează filtrele"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="logistics-page__content">
            {filtersOpen ? <div className="logistics-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { search: _search, ...rest } = current;
                    return value ? { ...rest, page: 1, search: value } : { ...rest, page: 1 };
                  });
                }}
                placeholder="Cod, pacient, clinică, medic"
                type="search"
                value={query.search ?? ""}
              />
              <Select
                label="Cabinet"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { clinicId: _clinicId, doctorId: _doctorId, ...rest } = current;
                    return value ? { ...rest, clinicId: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                options={(clinicOptionsQuery.data ?? []).map((clinic) => ({ label: `${clinic.code} · ${clinic.name}`, value: clinic.id }))}
                placeholder="Toate"
                value={query.clinicId ?? ""}
              />
              <Select
                label="Medic"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { doctorId: _doctorId, ...rest } = current;
                    return value ? { ...rest, doctorId: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                options={(doctorOptionsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
                placeholder="Toți"
                value={query.doctorId ?? ""}
              />
              <Select
                label="Tehnician"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { technicianId: _technicianId, ...rest } = current;
                    return value ? { ...rest, page: 1, technicianId: value } : { ...rest, page: 1 };
                  });
                }}
                options={(techniciansQuery.data ?? []).map((technician) => ({ label: technician.displayName, value: technician.id }))}
                placeholder="Toți"
                value={query.technicianId ?? ""}
              />
              <Select
                label="Recepție"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { receptionUserId: _receptionUserId, ...rest } = current;
                    return value ? { ...rest, page: 1, receptionUserId: value } : { ...rest, page: 1 };
                  });
                }}
                options={(receptionUsersQuery.data?.items ?? []).map((user) => ({ label: user.displayName, value: user.id }))}
                placeholder="Toți"
                value={query.receptionUserId ?? ""}
              />
              <Select
                label="Tip lucrare"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { workTypeId: _workTypeId, ...rest } = current;
                    return value ? { ...rest, page: 1, workTypeId: value } : { ...rest, page: 1 };
                  });
                }}
                options={(workTypeOptionsQuery.data ?? []).map((workType) => ({ label: `${workType.symbol} · ${workType.name}`, value: workType.id }))}
                placeholder="Toate"
                value={query.workTypeId ?? ""}
              />
              <DateInput
                label="Data exactă"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { dateFrom: _dateFrom, dateTo: _dateTo, exactDate: _exactDate, ...rest } = current;
                    return value ? { ...rest, exactDate: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                value={query.exactDate ?? ""}
              />
              <DateInput
                label="De la"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { dateFrom: _dateFrom, exactDate: _exactDate, ...rest } = current;
                    return value ? { ...rest, dateFrom: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                value={query.dateFrom ?? ""}
              />
              <DateInput
                label="Până la"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { dateTo: _dateTo, exactDate: _exactDate, ...rest } = current;
                    return value ? { ...rest, dateTo: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                value={query.dateTo ?? ""}
              />
              <Select
                label="Status logistic"
                onChange={(event) => {
                  const value = event.target.value as LogisticsCenterQuery["logisticsStatus"] | "";
                  setQuery((current) => {
                    const { logisticsStatus: _status, ...rest } = current;
                    return value ? { ...rest, logisticsStatus: value, page: 1 } : { ...rest, page: 1 };
                  });
                }}
                options={[{ label: "Toate", value: "" }, ...Object.entries(LOGISTICS_STATUS_LABELS).map(([value, label]) => ({ label, value }))]}
                value={query.logisticsStatus ?? ""}
              />
              <Select
                label="Prioritate"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { priority: _priority, ...rest } = current;
                    return value === "URGENT" || value === "NORMAL" ? { ...rest, page: 1, priority: value } : { ...rest, page: 1 };
                  });
                }}
                options={[{ label: "Toate", value: "" }, { label: "Urgente", value: "URGENT" }, { label: "Normal", value: "NORMAL" }]}
                value={query.priority ?? ""}
              />
            </div> : null}

            {centerQuery.isLoading ? <LoadingState text="Se încarcă centrul operațional" /> : null}
            {centerQuery.isError ? <ErrorState title="Centrul operațional nu a fost încărcat" description={getErrorMessage(centerQuery.error)} /> : null}
            <div className="logistics-page__list">
              <div aria-hidden="true" className="logistics-page__table-header">
                <span>Clinica sau Medic</span>
                <span>Pacient</span>
                <span>Tip lucrare</span>
                <span>Culoare</span>
                <span>Tehnician</span>
                <span>Preluare</span>
                <span>Termen</span>
                <span>Stare</span>
                <span>Alerte</span>
                <span>Livrare/Ridicare</span>
              </div>
              {(centerQuery.data?.items ?? []).filter((item) => {
                if (!routeQueueOnly) return true;
                if (!isReadyForLogisticsRoute(item)) return false;
                const horizon = query.deliveryHorizonDays;
                return !horizon || isWithinDays(item.requestedDeliveryDate, horizon);
              }).filter((item) => !assignedStopKeys.has(`DELIVERY:${item.id}`) && !assignedStopKeys.has(`PICKUP:${item.id}`)).map((item) => (
                <WorkRow item={item} key={item.id} onFastAction={(direction) => {
                  queueTransport.mutate({
                    workOrderId: item.id,
                    input: { direction, version: item.logistics.version },
                  }, {
                    onSuccess: () => openRouteLists(direction),
                    onError: (error) => toast.showToast({ title: "Lucrarea nu a fost adăugată în coadă", message: getErrorMessage(error), variant: "error" }),
                  });
                }} onOpen={() => navigate(`/works?workId=${encodeURIComponent(item.id)}`)} onRework={() => setReworkItem(item)} onStatus={(status) => updateWorkStatus.mutate({ status, workOrderId: item.id })} onUpdateActions={(input) => {
                  const nextDelivery = input.requiresDelivery ?? item.requiresDelivery;
                  const nextPickup = input.requiresPickup ?? item.requiresPickup;
                  updateWorkActions.mutate({ input: { ...input, ...(nextDelivery ? { requiresPickup: false } : {}), ...(nextPickup ? { requiresDelivery: false } : {}) }, workOrderId: item.id });
                }} />
              ))}
              {showPickups ? (pickupsQuery.data ?? []).filter((pickup) => !routeQueueOnly || !query.pickupHorizonDays || isWithinDays(pickup.scheduledDate, query.pickupHorizonDays)).filter((pickup) => !assignedStopKeys.has(`PICKUP:${pickup.id}`)).map((pickup) => (
                <PickupRouteRow
                  canCancel={canCancelPickup}
                  canUpdate={canUpdatePickup}
                  key={pickup.id}
                  onCancel={() => {
                    cancelPickup.mutate({ input: { version: pickup.version }, pickupId: pickup.id }, {
                      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Ridicarea nu a fost anulată", variant: "error" }),
                      onSuccess: () => toast.showToast({ message: "Ridicarea a fost anulată.", variant: "success" }),
                    });
                  }}
                  onEdit={() => { setEditingPickup(pickup); setPickupModalOpen(true); }}
                  pickup={pickup}
                  selected={false}
                  onSelected={(selected) => {
                    if (!selected) return;
                    openRouteLists("PICKUP");
                  }}
                />
              )) : null}
            </div>
          </CardContent>
        </Card>

      </section>

      <LogisticsCreateWorkModal isOpen={isCreateWorkOpen} onOpenChange={setCreateWorkOpen} />
      <PickupRequestModal editingPickup={editingPickup} isOpen={isPickupModalOpen} onOpenChange={(open) => { setPickupModalOpen(open); if (!open) setEditingPickup(null); }} />
      <ReworkProbeModal item={reworkItem} isOpen={reworkItem !== null} onOpenChange={(open) => { if (!open) setReworkItem(null); }} />
    </main>
  );
}

function toDeadlineIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = (time || "23:59").split(":").map(Number);
  const utcGuess = Date.UTC(year!, month! - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-CA", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "2-digit", timeZone: "Europe/Bucharest", year: "numeric", hourCycle: "h23" }).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const zonedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(utcGuess - (zonedAsUtc - utcGuess)).toISOString();
}

function ReworkProbeModal({ item, isOpen, onOpenChange }: { readonly item: LogisticsCenterItem | null; readonly isOpen: boolean; readonly onOpenChange: (open: boolean) => void }): ReactNode {
  const toast = useToast();
  const rework = useReworkProbe();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen || !item) return;
    setDate(item.requestedDeliveryDate.slice(0, 10));
    setTime("");
    setReason("");
  }, [isOpen, item]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!item || !date || reason.trim().length < 3) return;
    rework.mutate({ workOrderId: item.id, input: { deadlineAt: toDeadlineIso(date, time), reason: reason.trim() } }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost trimisă la refacere", variant: "error" }),
      onSuccess: () => {
        toast.showToast({ message: "Lucrarea a revenit în lista tehnicienilor.", title: "Refacere inițiată", variant: "success" });
        onOpenChange(false);
      },
    });
  }

  return <Modal
    footer={<FormActions formId="rework-probe-form" isSubmitting={rework.isPending} submitLabel="Trimite la refacere" />}
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    size="md"
    title={`Refacere · ${item?.workCode ?? "lucrare"}`}
  >
    <form id="rework-probe-form" onSubmit={submit}>
      <p>Lucrarea revine direct în „Lucrări de preluat”, fără curier și fără traseu logistic.</p>
      <DateInput label="Termen" required value={date} onChange={(event) => setDate(event.target.value)} />
      <TextInput label="Ora (opțional)" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
      {!time ? <small>Ora nu este setată. Este obligatorie doar data.</small> : null}
      <Textarea label="Motivul refacerii" required rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
    </form>
  </Modal>;
}

function PickupRouteRow({
  canCancel,
  canUpdate,
  onCancel,
  onEdit,
  onSelected,
  pickup,
  selected,
}: {
  readonly canCancel: boolean;
  readonly canUpdate: boolean;
  readonly onCancel: () => void;
  readonly onEdit: () => void;
  readonly onSelected: (selected: boolean) => void;
  readonly pickup: PickupRequestView;
  readonly selected: boolean;
}): ReactNode {
  return (
    <article className="logistics-page__row logistics-page__row--pickup">
      <div className="logistics-page__row-place"><strong>{pickup.clinic.name}</strong><span>{pickup.doctor?.name ?? "Fără medic"}</span></div>
      <div className="logistics-page__row-main logistics-page__row-main--static"><span className="logistics-page__code">Ridicare</span><strong>-</strong></div>
      <div className="logistics-page__row-type">Cerere ridicare</div>
      <div className="logistics-page__row-value">-</div>
      <div className="logistics-page__row-value">-</div>
      <div className="logistics-page__row-value">-</div>
      <div className="logistics-page__row-value">{formatDate(`${pickup.scheduledDate}T00:00:00.000Z`)} · {pickup.scheduleLabel}</div>
      <div className="logistics-page__row-state"><StatusBadge label={PICKUP_REQUEST_STATUS_LABELS[pickup.status]} variant="planned" /></div>
      <div className="logistics-page__row-alerts">{pickup.notes ?? pickup.address ?? "-"}</div>
      <div aria-label={`Selectează ridicarea de la ${pickup.clinic.name}`} className="logistics-page__row-requirements">
        <Button disabled={selected} onClick={() => onSelected(true)} size="small" type="button" variant="outline">Ridicare</Button>
        <div className="logistics-page__row-actions">
          {canUpdate && pickup.status === "SCHEDULED" ? <Button onClick={onEdit} size="small" type="button" variant="outline">Editează</Button> : null}
          {canCancel && pickup.status === "SCHEDULED" ? <Button onClick={onCancel} size="small" type="button" variant="ghost">Anulează</Button> : null}
        </div>
      </div>
    </article>
  );
}

function PickupRequestModal({
  editingPickup,
  isOpen,
  onOpenChange,
}: {
  readonly editingPickup: PickupRequestView | null;
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
}): ReactNode {
  const toast = useToast();
  const form = useForm<PickupFormValues>({
    defaultValues: defaultPickupFormValues,
    resolver: zodResolver(pickupFormSchema),
  });
  const createPickup = useCreatePickupRequest();
  const updatePickup = useUpdatePickupRequest();
  const selectedClinicId = form.watch("clinicId");
  const clinicOptionsQuery = useQuery({ enabled: isOpen, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorOptionsQuery = useQuery({
    enabled: isOpen,
    queryFn: () => fetchDoctorOptions(selectedClinicId || undefined),
    queryKey: ["doctors", "options", "pickup", selectedClinicId],
    retry: false,
  });
  const selectedClinicQuery = useQuery({
    enabled: isOpen && Boolean(selectedClinicId),
    queryFn: () => fetchClinic(selectedClinicId),
    queryKey: ["clinics", "detail", "pickup", selectedClinicId],
    retry: false,
  });
  const isSaving = createPickup.isPending || updatePickup.isPending;
  const closeGuard = useCloseGuard(form.formState.isDirty, isSaving, onOpenChange);
  const title = editingPickup ? "Editează ridicare" : "Ridicare nouă";

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultPickupFormValues);
      return;
    }
    if (editingPickup) {
      form.reset({
        address: editingPickup.address ?? "",
        clinicId: editingPickup.clinic.id,
        doctorId: editingPickup.doctor?.id ?? "",
        exactTime: editingPickup.exactTime ?? "",
        notes: editingPickup.notes ?? "",
        scheduledDate: editingPickup.scheduledDate,
        scheduleType: "RANGE",
        windowEndTime: editingPickup.windowEndTime ?? "",
        windowStartTime: editingPickup.windowStartTime ?? "",
        phone: editingPickup.phone ?? "",
      });
    } else {
      form.reset(defaultPickupFormValues);
    }
  }, [editingPickup, form, isOpen]);

  useEffect(() => {
    if (!isOpen || editingPickup || !selectedClinicQuery.data || selectedClinicQuery.data.id !== selectedClinicId) return;
    const clinic = selectedClinicQuery.data;
    const address = [clinic.addressLine1, clinic.addressLine2, clinic.postalCode, clinic.city].filter(Boolean).join(", ");
    form.setValue("address", address, { shouldDirty: false, shouldValidate: true });
    form.setValue("phone", clinic.phone ?? clinic.contactPersonPhone ?? "", { shouldDirty: false, shouldValidate: true });
  }, [editingPickup, form, isOpen, selectedClinicId, selectedClinicQuery.data]);

  useBeforeUnloadPrompt(isOpen && form.formState.isDirty && !isSaving);

  function toInput(values: PickupFormValues): CreatePickupRequestInput {
    return {
      address: values.address.trim().length === 0 ? null : values.address.trim(),
      clinicId: values.clinicId,
      doctorId: values.doctorId || null,
      exactTime: null,
      notes: values.notes.trim().length === 0 ? null : values.notes.trim(),
      scheduledDate: values.scheduledDate,
      scheduleType: "RANGE",
      windowEndTime: values.windowEndTime,
      windowStartTime: values.windowStartTime,
      phone: values.phone.trim().length === 0 ? null : values.phone.trim(),
    };
  }

  function submit(values: PickupFormValues): void {
    const input = toInput(values);
    if (editingPickup) {
      updatePickup.mutate({ input: { ...input, version: editingPickup.version } satisfies UpdatePickupRequestInput, pickupId: editingPickup.id }, {
        onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Ridicarea nu a fost actualizată", variant: "error" }),
        onSuccess: () => {
          toast.showToast({ message: "Ridicarea a fost actualizată.", variant: "success" });
          onOpenChange(false);
        },
      });
      return;
    }
    createPickup.mutate(input, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Ridicarea nu a fost creată", variant: "error" }),
      onSuccess: () => {
        toast.showToast({ message: "Ridicarea a fost creată.", variant: "success" });
        onOpenChange(false);
      },
    });
  }

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && form.formState.isDirty && !isSaving} />
      <Modal
        footer={<FormActions canReset={form.formState.isDirty} formId="pickup-request-form" isSubmitting={isSaving} onReset={() => form.reset(editingPickup ? {
          address: editingPickup.address ?? "",
          clinicId: editingPickup.clinic.id,
          doctorId: editingPickup.doctor?.id ?? "",
          exactTime: editingPickup.exactTime ?? "",
          notes: editingPickup.notes ?? "",
          scheduledDate: editingPickup.scheduledDate,
          scheduleType: "RANGE",
          windowEndTime: editingPickup.windowEndTime ?? "",
          windowStartTime: editingPickup.windowStartTime ?? "",
          phone: editingPickup.phone ?? "",
        } : defaultPickupFormValues)} submitLabel={editingPickup ? "Salvează ridicarea" : "Creează ridicare"} />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        size="md"
        title={title}
      >
        <form className="logistics-page__pickup-form" id="pickup-request-form" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <SearchableChoiceField
            disabled={clinicOptionsQuery.isLoading || clinicOptionsQuery.isError}
            emptyMessage="Nu există clinici disponibile."
            error={form.formState.errors.clinicId?.message}
            hint={clinicOptionsQuery.isError ? getErrorMessage(clinicOptionsQuery.error) : clinicOptionsQuery.isLoading ? "Se încarcă clinicile…" : "Caută după numele clinicii."}
            label="Clinica"
            onChange={(value) => {
              form.setValue("clinicId", value, { shouldDirty: true, shouldValidate: true });
              form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true });
            }}
            options={(clinicOptionsQuery.data ?? []).map((clinic) => ({ label: clinic.name, value: clinic.id }))}
            required
            value={selectedClinicId}
          />
          <SearchableChoiceField
            disabled={!selectedClinicId || doctorOptionsQuery.isLoading || doctorOptionsQuery.isError}
            emptyMessage={selectedClinicId ? "Nu există medici pentru clinica aleasă." : "Selectează mai întâi clinica."}
            error={form.formState.errors.doctorId?.message}
            hint={doctorOptionsQuery.isError ? getErrorMessage(doctorOptionsQuery.error) : doctorOptionsQuery.isLoading ? "Se încarcă medicii…" : "Alege medicul din listă."}
            label="Medic"
            onChange={(value) => form.setValue("doctorId", value, { shouldDirty: true, shouldValidate: true })}
            options={(doctorOptionsQuery.data ?? []).map((doctor) => ({ label: doctor.displayName, value: doctor.id }))}
            value={form.watch("doctorId")}
          />
          <TextInput className="logistics-page__pickup-contact" error={form.formState.errors.address?.message} label="Adresă ridicare" {...form.register("address")} />
          <TextInput className="logistics-page__pickup-contact" error={form.formState.errors.phone?.message} label="Telefon ridicare" type="tel" {...form.register("phone")} />
          <DateInput className="logistics-page__pickup-date-picker" error={form.formState.errors.scheduledDate?.message} label="Data programării" required {...form.register("scheduledDate")} />
          <div className="logistics-page__pickup-range" aria-label="Interval orar ridicare">
            <TextInput className="logistics-page__pickup-time-picker" error={form.formState.errors.windowStartTime?.message} label="De la" required type="time" {...form.register("windowStartTime")} />
            <TextInput className="logistics-page__pickup-time-picker" error={form.formState.errors.windowEndTime?.message} label="Până la" required type="time" {...form.register("windowEndTime")} />
          </div>
          <Textarea error={form.formState.errors.notes?.message} label="Note" rows={3} {...form.register("notes")} />
        </form>
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}

type SearchableChoice = { readonly label: string; readonly secondary?: string; readonly value: string };

function SearchableChoiceField({
  disabled = false,
  emptyMessage,
  error,
  hint,
  label,
  onChange,
  options,
  required,
  value,
}: {
  readonly disabled?: boolean;
  readonly emptyMessage?: string;
  readonly error: string | undefined;
  readonly hint?: string;
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly SearchableChoice[];
  readonly required?: boolean;
  readonly value: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const id = useId();
  const selected = options.find((option) => option.value === value);
  const visibleOptions = options.filter((option) => `${option.label} ${option.secondary ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).slice(0, 20);

  useEffect(() => {
    if (selected && !open) setSearch(selected.label);
  }, [open, selected]);

  return (
    <div className="logistics-page__choice-field">
      <label className="logistics-page__choice-label" htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
      <div className="logistics-page__choice-control">
          <input
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          className="dl-control logistics-page__choice-input"
          disabled={disabled}
          id={id}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => { setSearch(event.target.value); onChange(""); setOpen(true); }}
          onFocus={() => { setSearch(selected?.label ?? ""); setOpen(true); }}
          placeholder={disabled ? "Indisponibil" : `Caută ${label.toLocaleLowerCase()}`}
          role="combobox"
          value={search || selected?.label || ""}
        />
        {open ? (
          <div aria-label={`Opțiuni ${label.toLocaleLowerCase()}`} className="logistics-page__choice-menu" role="listbox">
            {visibleOptions.length > 0 ? visibleOptions.map((option) => (
              <button className="logistics-page__choice-option" key={option.value} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.value); setSearch(option.label); setOpen(false); }} role="option" type="button">
                <strong>{option.label}</strong>
                {option.secondary ? <span>{option.secondary}</span> : null}
              </button>
            )) : <span className="logistics-page__choice-empty">{emptyMessage ?? "Nu există opțiuni potrivite."}</span>}
          </div>
        ) : null}
      </div>
      {hint ? <span className="logistics-page__choice-hint">{hint}</span> : null}
      {error ? <span className="logistics-page__choice-error">{error}</span> : null}
    </div>
  );
}

function LogisticsCreateWorkModal({ isOpen, onOpenChange }: { readonly isOpen: boolean; readonly onOpenChange: (isOpen: boolean) => void }): ReactNode {
  const toast = useToast();
  const [attachments, setAttachments] = useState<readonly File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const form = useForm<WorkFormValues>({
    defaultValues: defaultWorkFormValues,
    resolver: zodResolver(workFormSchema),
  });
  const createMutation = useCreateLogisticsWork();
  const selectedClinicId = form.watch("clinicId");
  const selectedDoctorId = form.watch("doctorId");
  const selectedWorkTypeId = form.watch("workTypeId");
  const quantity = form.watch("quantity");
  const requestedDeliveryDate = form.watch("requestedDeliveryDate");
  const requestedDeliveryTime = form.watch("requestedDeliveryTime");
  const clinicOptionsQuery = useQuery({ enabled: isOpen, queryFn: fetchClinicOptions, queryKey: ["clinics", "options"], retry: false });
  const doctorOptionsQuery = useQuery({
    enabled: isOpen,
    queryFn: () => fetchDoctorOptions(selectedClinicId || undefined),
    queryKey: ["doctors", "options", "logistics-create-work", selectedClinicId],
    retry: false,
  });
  const patientOptionsQuery = usePatientOptions("", isOpen, selectedClinicId || undefined, selectedDoctorId || undefined);
  const workTypeOptionsQuery = useWorkFormWorkTypeOptions(isOpen);
  const deadlinePreviewInput = useMemo(() => toWorkDeadlinePreviewInput({
    clinicId: selectedClinicId,
    doctorId: selectedDoctorId,
    quantity,
    requestedDeliveryDate,
    requestedDeliveryTime,
    workTypeId: selectedWorkTypeId,
  }), [quantity, requestedDeliveryDate, requestedDeliveryTime, selectedClinicId, selectedDoctorId, selectedWorkTypeId]);
  const deadlinePreviewQuery = useWorkDeadlinePreview(deadlinePreviewInput, isOpen);
  const activeTemplateQuery = useActiveWorkFormTemplate(selectedWorkTypeId || undefined, isOpen && selectedWorkTypeId !== "");
  const hasUnsavedAttachments = attachments.length > 0;
  const closeGuard = useCloseGuard(form.formState.isDirty || hasUnsavedAttachments, createMutation.isPending, onOpenChange);
  const submitDisabled = activeTemplateQuery.isLoading || activeTemplateQuery.isError || attachmentError !== null;

  useEffect(() => {
    if (!isOpen) {
      form.reset(defaultWorkFormValues);
      setAttachments([]);
      setAttachmentError(null);
    }
  }, [form, isOpen]);

  useEffect(() => {
    form.setValue("workFormValues", {}, { shouldDirty: form.formState.isDirty, shouldValidate: false });
  }, [form, selectedWorkTypeId]);

  useEffect(() => {
    if (createMutation.error) {
      applyApiErrorsToForm(form, createMutation.error);
    }
  }, [createMutation.error, form]);

  useBeforeUnloadPrompt(isOpen && (form.formState.isDirty || hasUnsavedAttachments) && !createMutation.isPending);

  function addAttachments(files: readonly File[]): void {
    const next = [...attachments, ...files];
    const error = validateAttachmentSelection(next);
    setAttachmentError(error);
    if (!error) {
      setAttachments(next);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>): void {
    addAttachments(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    addAttachments(Array.from(event.dataTransfer.files));
  }

  return (
    <>
      <UnsavedChangesPrompt when={isOpen && (form.formState.isDirty || hasUnsavedAttachments) && !createMutation.isPending} />
      <Modal
        description="Creează o lucrare din logistică folosind aceleași câmpuri canonice ca la recepție."
        footer={<FormActions canReset={form.formState.isDirty || hasUnsavedAttachments} formId="logistics-create-work-form" isSubmitting={createMutation.isPending} onReset={() => { form.reset(defaultWorkFormValues); setAttachments([]); setAttachmentError(null); }} submitDisabled={submitDisabled} submitLabel="Creează lucrare" />}
        isOpen={isOpen}
        onOpenChange={closeGuard.handleOpenChange}
        size="full"
        title="Lucrare nouă"
      >
        <WorkForm
          clinicOptions={clinicOptionsQuery.data ?? []}
          deadlinePreview={deadlinePreviewQuery.data ?? null}
          doctorOptions={doctorOptionsQuery.data ?? []}
          form={form}
          formId="logistics-create-work-form"
          isDeadlinePreviewLoading={deadlinePreviewQuery.isFetching}
          isDisabled={createMutation.isPending}
          onClinicChange={() => form.setValue("doctorId", "", { shouldDirty: true, shouldValidate: true })}
          onCreatePatient={() => toast.showToast({ message: "Creează pacientul în registru, apoi revino la lucrare.", title: "Registru pacienți", variant: "info" })}
          onSubmit={(values) => {
            form.clearErrors("root");
            createMutation.mutate({ attachments, input: toWorkMutationInput(values, activeTemplateQuery.data) }, {
              onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost creată", variant: "error" }),
              onSuccess: (response) => {
                toast.showToast({
                  message: `${response.work.code} a fost creată cu ${response.attachments.length} atașamente.`,
                  title: "Lucrare creată",
                  variant: "success",
                });
                form.reset(defaultWorkFormValues);
                setAttachments([]);
                setAttachmentError(null);
                onOpenChange(false);
              },
            });
          }}
          patientOptions={patientOptionsQuery.data ?? []}
          workTypeOptions={workTypeOptionsQuery.data ?? []}
        />
        <section className="logistics-page__attachments" aria-labelledby="logistics-attachments-title">
          <div>
            <h3 id="logistics-attachments-title">Atașamente</h3>
            <p>Imagini JPEG, PNG, WebP sau PDF. Maximum 8 fișiere, 5 MB pe fișier.</p>
          </div>
          <div className="logistics-page__dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <span>Trage fișierele aici</span>
            <label>
              <input accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" multiple onChange={handleFileInput} type="file" />
              Alege fișiere
            </label>
          </div>
          {attachmentError ? <p className="logistics-page__attachment-error">{attachmentError}</p> : null}
          {attachments.length > 0 ? (
            <ul className="logistics-page__attachment-list">
              {attachments.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <span>{file.name}</span>
                  <small>{formatFileSize(file.size)}</small>
                  <Button onClick={() => { const next = attachments.filter((_, itemIndex) => itemIndex !== index); setAttachments(next); setAttachmentError(validateAttachmentSelection(next)); }} size="small" type="button" variant="ghost">Elimină</Button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </Modal>
      {closeGuard.confirmModal}
    </>
  );
}

function validateAttachmentSelection(files: readonly File[]): string | null {
  if (files.length > attachmentLimits.maxFiles) {
    return `Poți atașa cel mult ${attachmentLimits.maxFiles} fișiere.`;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > attachmentLimits.maxTotalBytes) {
    return "Dimensiunea totală a atașamentelor depășește 20 MB.";
  }
  for (const file of files) {
    if (file.name.trim().length === 0 || file.name.length > 255) {
      return "Numele fișierului este invalid.";
    }
    if (file.size <= 0 || file.size > attachmentLimits.maxFileBytes) {
      return `${file.name} depășește limita de 5 MB.`;
    }
    if (!attachmentLimits.allowedMimeTypes.includes(file.type as (typeof attachmentLimits.allowedMimeTypes)[number])) {
      return `${file.name} are un tip de fișier nepermis.`;
    }
  }
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function SummaryCard({ active, dayWindow, label, onClick, onDayWindowChange, value }: { readonly active: boolean; readonly dayWindow?: 1 | 2 | 3; readonly label: string; readonly onClick: () => void; readonly onDayWindowChange?: (days: 1 | 2 | 3) => void; readonly value: number }): ReactNode {
  const hasWindow = onDayWindowChange !== undefined;
  return (
    <div className={`logistics-page__summary-card${active ? " is-active" : ""}`} data-active={active}>
      <button aria-label={label} className="logistics-page__summary-card-main" onClick={onClick} type="button">
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
      {hasWindow ? <span className="logistics-page__summary-window" onClick={(event) => event.stopPropagation()}>
        {[1, 2, 3].map((days) => <button aria-label={`${label} în ${days} zi`} aria-pressed={dayWindow === days} className={dayWindow === days ? "is-active" : ""} key={days} onClick={(event) => { event.stopPropagation(); onDayWindowChange(days as 1 | 2 | 3); }} title={`${label} în ${days} zi`} type="button">{days}</button>)}
      </span> : null}
    </div>
  );
}

function WorkRow({
  item,
  onOpen,
  onFastAction,
  onRework,
  onStatus,
  onUpdateActions,
}: {
  readonly item: LogisticsCenterItem;
  readonly onOpen: () => void;
  readonly onFastAction: (direction: "DELIVERY" | "PICKUP") => void;
  readonly onRework: () => void;
  readonly onStatus: (status: (typeof FINAL_WORK_STATUSES)[number]) => void;
  readonly onUpdateActions: (input: { readonly logisticsNote?: string | null; readonly marker?: LogisticsMarker | null; readonly requiresDelivery?: boolean; readonly requiresPickup?: boolean }) => void;
}): ReactNode {
  const [markerOpen, setMarkerOpen] = useState(false);
  const marker = item.logisticsMarker;
  const isPickupOperation = item.requiresPickup && !item.requiresDelivery;
  return (
    <article className="logistics-page__row">
      <div className="logistics-page__row-place"><strong>{item.clinic.name}</strong><span>{item.doctor.name}</span></div>
      <button className="logistics-page__row-main" onClick={onOpen} type="button">
        <span className="logistics-page__code">{item.workCode}</span>
        <strong>{item.patientName}</strong>
      </button>
      <div className="logistics-page__row-type">
        {item.workTypeName}
        {item.technicalReadiness === "PROBE_READY" ? <small>Probă gata</small> : null}
        {item.technicalReadiness === "FINAL_READY" ? <small>Finalizată</small> : null}
      </div>
      <div className="logistics-page__row-value">-</div>
      <div className="logistics-page__row-technician">
        <span className="logistics-page__technician-dot" style={{ backgroundColor: item.technician?.preferredColor ?? "transparent" }} />
        {item.technician?.name ?? item.workflow.assignedUserName ?? "-"}
      </div>
      <div className="logistics-page__row-value">{item.claimedAt ? formatDate(item.claimedAt) : "-"}</div>
      <div className={`logistics-page__row-value${item.dueState === "OVERDUE" ? " logistics-page__row-value--overdue" : ""}`}>
        {item.dueState === "OVERDUE" ? <strong aria-label="Termen depășit" className="logistics-page__overdue-alert">!</strong> : null}
        {formatDate(item.requestedDeliveryDate)}
      </div>
      <div className="logistics-page__row-state">
        <StatusPicker itemCode={item.workCode} onChange={onStatus} readiness={item.technicalReadiness} value={item.operationalStatus} />
        {item.technicalReadiness === "PROBE_READY" || item.technicalReadiness === "FINAL_READY" ? <Button onClick={onRework} size="small" type="button" variant="outline">Trimite la refacere</Button> : null}
      </div>
      <div className="logistics-page__row-alerts">
        {item.dueState === "OVERDUE" ? <span aria-label="Termen depășit" className="logistics-page__overdue-alert">!</span> : null}
        <button aria-label="Marcaj logistic" className={`logistics-page__marker logistics-page__marker--${marker ?? "none"}`} onClick={() => setMarkerOpen((current) => !current)} title="Marcaj logistic" type="button" />
        {markerOpen ? <div className="logistics-page__marker-menu">{LOGISTICS_MARKERS.map((value) => <button aria-label={`Alege marcajul ${value.slice(-1)}`} className={`logistics-page__marker logistics-page__marker--${value}`} key={value} onClick={() => { onUpdateActions({ marker: value }); setMarkerOpen(false); }} title={`Marcaj ${value.slice(-1)}`} type="button" />)}</div> : null}
      </div>
      <div aria-label={isPickupOperation ? "Ridicare" : "Livrare"} className="logistics-page__row-requirements">
        {item.requiresLogisticsAction ? <Button onClick={() => onFastAction(isPickupOperation ? "PICKUP" : "DELIVERY")} size="small" variant="outline">{isPickupOperation ? "Ridicare" : "Livrare"}</Button> : null}
      </div>
    </article>
  );
}

function StatusPicker({ itemCode, onChange, readiness, value }: { readonly itemCode: string; readonly onChange: (status: (typeof FINAL_WORK_STATUSES)[number]) => void; readonly readiness: LogisticsCenterItem["technicalReadiness"]; readonly value: (typeof FINAL_WORK_STATUSES)[number] }): ReactNode {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Recepție", value: "RECEPTIE" },
    { label: "În lucru", value: "IN_LUCRU" },
    { label: "În așteptare", value: "IN_ASTEPTARE" },
    { label: "Finalizată", value: "FINALIZATA" },
  ] as const;
  const selected = readiness === "PROBE_READY"
    ? { label: "Probă", value }
    : options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="logistics-page__state-picker">
      <button aria-expanded={open} aria-haspopup="listbox" aria-label={`Stare ${itemCode}`} className="logistics-page__state-picker-trigger" onClick={() => setOpen((current) => !current)} type="button">
        <span>{selected.label}</span><span aria-hidden="true" className="logistics-page__state-picker-chevron" />
      </button>
      {open ? (
        <div aria-label={`Opțiuni stare ${itemCode}`} className="logistics-page__state-picker-menu" role="listbox">
          {options.map((option) => (
            <button aria-selected={option.value === value} className={`logistics-page__state-picker-option${option.value === value ? " is-selected" : ""}`} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} role="option" type="button">
              {option.value === value ? <span aria-hidden="true">✓</span> : <span aria-hidden="true" />}{option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="logistics-page"><section className="dl-container logistics-page__layout">{children}</section></main>;
}
