import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DateInput, ErrorState, IconButton, LoadingState, Select, TextInput, Tooltip, useToast } from "@dental-lab/ui";
import type { CourierRouteStopInput, CourierRouteView, LogisticsCenterItem, PickupRequestView } from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { useCourierOptions } from "../deliveries/deliveries-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useCourierRoutes, useCreateCourierRoute, useDeleteCourierRoute, useLogisticsCenter, usePickupRequests, useUpdateCourierRoute } from "./logistics-api.js";
import "./logistics-page.css";

type SelectedStop =
  | { readonly addressOverride?: string | undefined; readonly id: string; readonly label: string; readonly location: string; readonly phoneOverride?: string | undefined; readonly type: "DELIVERY"; readonly workOrderId: string }
  | { readonly addressOverride?: string | undefined; readonly id: string; readonly label: string; readonly location: string; readonly phoneOverride?: string | undefined; readonly pickupRequestId?: string; readonly stopNotes?: string; readonly type: "PICKUP"; readonly workOrderId?: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateParts(value: string): { day: number; month: number; year: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { day: day || 1, month: (month || 1) - 1, year: year || new Date().getUTCFullYear() };
}

function composeDate(year: number, month: number, day: number): string {
  const safeDay = Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function LogisticsRouteBuilderPage(): ReactNode {
  const toast = useToast();
  const [routeDate, setRouteDate] = useState(today());
  const [courierUserId, setCourierUserId] = useState("");
  const [routeName, setRouteName] = useState("Traseu");
  const [selectedStops, setSelectedStops] = useState<readonly SelectedStop[]>([]);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteStatus, setEditingRouteStatus] = useState<CourierRouteView["status"] | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null);
  const [assigningCourierId, setAssigningCourierId] = useState("");
  const [printRouteId, setPrintRouteId] = useState<string | null>(null);
  const [listDate, setListDate] = useState(today());
  const [listCourierId, setListCourierId] = useState("");
  const [listRouteId, setListRouteId] = useState("");
  const [searchParams] = useSearchParams();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadCenter = hasPermission(permissionsQuery.data, "logistics.center.read");
  const canReadRoutes = hasPermission(permissionsQuery.data, "routes.read") || canReadCenter;
  const canReadPickups = hasPermission(permissionsQuery.data, "pickup.read");
  const canRead = canReadRoutes || canReadCenter || canReadPickups;
  const canCreate = hasPermission(permissionsQuery.data, "routes.create") || canReadCenter;
  const canAssign = hasPermission(permissionsQuery.data, "routes.assign");
  const canCancel = hasPermission(permissionsQuery.data, "routes.cancel");
  const deliveryCandidatesQuery = useLogisticsCenter({
    category: "ALL",
    page: 1,
    pageSize: 100,
    sortBy: "requestedDeliveryDate",
    sortDirection: "asc",
  }, canReadCenter);
  const pickupsQuery = usePickupRequests(canReadPickups);
  const couriersQuery = useCourierOptions(canAssign);
  const routesQuery = useCourierRoutes({ exactDate: listDate, page: 1, pageSize: 20 }, canReadRoutes);
  const allRoutesQuery = useCourierRoutes({ page: 1, pageSize: 100 }, canReadRoutes);
  const createRoute = useCreateCourierRoute();
  const updateRoute = useUpdateCourierRoute();
  const deleteRoute = useDeleteCourierRoute();
  const selectedKeys = useMemo(() => new Set(selectedStops.map((stop) => stop.id)), [selectedStops]);
  const deliveryCandidates = deliveryCandidatesQuery.data?.items ?? [];
  const pickupCandidates = (pickupsQuery.data ?? []).filter((pickup) => pickup.status === "SCHEDULED");
  const assignedStopKeys = useMemo(() => new Set((allRoutesQuery.data?.items ?? [])
    .filter((route) => route.id !== editingRouteId && !(route.status === "DRAFT" && route.courier === null && route.name === "Lista pentru viitoarele trasee"))
    .flatMap((route) => route.stops
    .filter((stop) => stop.outcomeStatus === "PENDING" || stop.outcomeStatus === "DELIVERED" || stop.outcomeStatus === "PICKED_UP")
    .map((stop) => `${stop.type}:${stop.workOrderId ?? stop.pickupRequestId ?? stop.id}`))), [allRoutesQuery.data?.items, editingRouteId]);
  const visibleRoutes = useMemo(() => (routesQuery.data?.items ?? []).filter((route) => {
    if (printRouteId && route.id !== printRouteId) return false;
    if (listRouteId && route.id !== listRouteId) return false;
    return !listCourierId || route.courier?.id === listCourierId;
  }), [listCourierId, listRouteId, printRouteId, routesQuery.data?.items]);
  function editRoute(route: CourierRouteView): void {
    setEditingRouteId(route.id);
    setEditingRouteStatus(route.status);
    setEditingVersion(route.version);
    setRouteName(route.name);
    setRouteDate(route.routeDate);
    setCourierUserId(route.courier?.id ?? "");
    setSelectedStops(route.stops.map((stop) => ({
      id: `${stop.type}:${stop.workOrderId ?? stop.pickupRequestId ?? stop.id}`,
      label: stop.targetLabel,
      location: "",
      type: stop.type,
      ...(stop.addressOverride ? { addressOverride: stop.addressOverride } : {}),
      ...(stop.phoneOverride ? { phoneOverride: stop.phoneOverride } : {}),
      ...(stop.pickupRequestId ? { pickupRequestId: stop.pickupRequestId } : {}),
      ...(stop.stopNotes ? { stopNotes: stop.stopNotes } : {}),
      ...(stop.workOrderId ? { workOrderId: stop.workOrderId } : {}),
    })) as SelectedStop[]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAssigning(route: CourierRouteView): void {
    setAssigningRouteId(route.id);
    setAssigningCourierId(route.courier?.id ?? "");
  }

  function assignRoute(route: CourierRouteView): void {
    if (!assigningCourierId) {
      toast.showToast({ message: "Selectează un curier înainte de trimitere.", title: "Curier lipsă", variant: "error" });
      return;
    }
    updateRoute.mutate({
      routeId: route.id,
      input: {
        courierUserId: assigningCourierId,
        name: route.name,
        routeDate: route.routeDate,
        stops: route.stops.map((stop) => ({ addressOverride: stop.addressOverride, phoneOverride: stop.phoneOverride, pickupRequestId: stop.pickupRequestId, stopNotes: stop.stopNotes, type: stop.type, workOrderId: stop.workOrderId })),
      version: route.version,
      },
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a fost asignat", variant: "error" }),
      onSuccess: () => {
        setAssigningRouteId(null);
        setAssigningCourierId("");
        toast.showToast({ message: "Traseul a fost trimis curierului.", title: "Traseu asignat", variant: "success" });
      },
    });
  }

  function removeRoute(route: CourierRouteView): void {
    if (!window.confirm(`Ștergi traseul ${route.routeNumber}? Stopurile vor reveni în listele logistice.`)) return;
    deleteRoute.mutate(route.id, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a fost șters", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Traseul a fost șters, iar stopurile au revenit în liste.", title: "Traseu șters", variant: "success" }),
    });
  }

  useEffect(() => {
    const requestedListId = searchParams.get("listId");
    if (!requestedListId || allRoutesQuery.isLoading) return;
    const route = (allRoutesQuery.data?.items ?? []).find((item) => item.id === requestedListId);
    if (!route || editingRouteId === route.id) return;
    setListDate(route.routeDate);
    editRoute(route);
  }, [allRoutesQuery.data?.items, allRoutesQuery.isLoading, editingRouteId, searchParams]);

  function printRoutes(routeId?: string): void {
    const routes = routeId ? (routesQuery.data?.items ?? []).filter((route) => route.id === routeId) : visibleRoutes;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.showToast({ message: "Permite ferestrele pop-up pentru a tipări traseul.", title: "Tipărirea nu a fost deschisă", variant: "error" });
      return;
    }
    const html = routes.map((route) => `<article class="route"><h1>${escapePrintText(route.status === "DRAFT" ? "Listă" : "Traseu")} · ${escapePrintText(route.routeNumber)} · ${escapePrintText(route.name)}</h1><p><strong>Data:</strong> ${escapePrintText(route.routeDate)} &nbsp; <strong>Curier:</strong> ${escapePrintText(route.courier?.name ?? "Neasignat")}</p><ol>${route.stops.map((stop) => `<li><strong>${stop.stopOrder}. ${stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><br>${escapePrintText(stop.targetLabel)}<br><strong>Adresă:</strong> ${escapePrintText(stop.addressOverride || "-")}<br><strong>Telefon:</strong> ${escapePrintText(stop.phoneOverride || "-")}</li>`).join("")}</ol></article>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>Traseu</title><style>body{font-family:Arial,sans-serif;color:#17201d;margin:32px}.route{break-inside:avoid;border-bottom:1px solid #b8c2bd;margin-bottom:28px;padding-bottom:20px}.route h1{font-size:22px;margin:0 0 8px}.route p{margin:0 0 18px;color:#40514a}.route ol{padding-left:28px}.route li{border-top:1px solid #d8dfdc;margin:0;padding:12px 0;line-height:1.45}strong{font-weight:700}@media print{body{margin:15mm}}</style></head><body>${html || "<p>Nu există trasee pentru selecția curentă.</p>"}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  useEffect(() => {
    const requestedWorkIds = new Set((searchParams.get("workIds") ?? "").split(",").filter(Boolean));
    if (requestedWorkIds.size === 0 || deliveryCandidatesQuery.isLoading) return;
    setSelectedStops((current) => {
      const existing = new Set(current.map((stop) => stop.id));
      const additions = deliveryCandidates
        .filter((work) => requestedWorkIds.has(work.id) && !existing.has(`${work.requiresPickup ? "PICKUP" : "DELIVERY"}:${work.id}`))
        .map((work) => ({ id: `${work.requiresPickup ? "PICKUP" : "DELIVERY"}:${work.id}`, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, type: work.requiresPickup ? "PICKUP" as const : "DELIVERY" as const, workOrderId: work.id }));
      return additions.length > 0 ? [...current, ...additions] : current;
    });
  }, [deliveryCandidates, deliveryCandidatesQuery.isLoading, searchParams]);

  function addDelivery(work: LogisticsCenterItem): void {
    const id = `DELIVERY:${work.id}`;
    if (selectedKeys.has(id)) return;
    setSelectedStops((current) => [...current, { addressOverride: work.clinic.address ?? undefined, id, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, phoneOverride: work.clinic.phone ?? undefined, type: "DELIVERY", workOrderId: work.id }]);
  }

  function addPickup(pickup: PickupRequestView): void {
    const id = `PICKUP:${pickup.id}`;
    if (selectedKeys.has(id)) return;
    setSelectedStops((current) => [...current, { addressOverride: pickup.address ?? undefined, id, label: `${pickup.clinic.name} · ${pickup.scheduleLabel}`, location: pickup.clinic.name, phoneOverride: pickup.phone ?? undefined, pickupRequestId: pickup.id, type: "PICKUP" }]);
  }

  function addPickupWork(work: LogisticsCenterItem): void {
    const id = `PICKUP:${work.id}`;
    if (selectedKeys.has(id)) return;
    setSelectedStops((current) => [...current, { addressOverride: work.clinic.address ?? undefined, id, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, phoneOverride: work.clinic.phone ?? undefined, type: "PICKUP", workOrderId: work.id }]);
  }

  function removeStop(id: string): void {
    setSelectedStops((current) => current.filter((stop) => stop.id !== id));
  }

  function moveStop(id: string, offset: -1 | 1): void {
    setSelectedStops((current) => {
      const index = current.findIndex((stop) => stop.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (item) next.splice(target, 0, item);
      return next;
    });
  }

  function submit(): void {
    const stops: CourierRouteStopInput[] = selectedStops.map((stop) => stop.type === "DELIVERY"
      ? { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, type: "DELIVERY", workOrderId: stop.workOrderId }
      : { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, pickupRequestId: stop.pickupRequestId ?? null, stopNotes: stop.stopNotes ?? null, type: "PICKUP", workOrderId: stop.workOrderId ?? null });
    const input = {
      courierUserId: courierUserId || null,
      name: routeName,
      routeDate,
      stops,
    };
    const callbacks = {
      onError: (error: unknown) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a fost creat", variant: "error" }),
      onSuccess: () => {
        setSelectedStops([]);
        setEditingRouteId(null);
        setEditingVersion(null);
        setEditingRouteStatus(null);
        toast.showToast({ message: "Traseul a fost creat.", variant: "success" });
      },
    };
    if (editingRouteId && editingVersion) {
      updateRoute.mutate({ routeId: editingRouteId, input: { ...input, version: editingVersion } }, callbacks);
    } else {
      createRoute.mutate(input, callbacks);
    }
  }

  if (permissionsQuery.isLoading) {
    return <main className="logistics-page"><section className="dl-container logistics-page__layout"><LoadingState text="Se încarcă traseul" /></section></main>;
  }

  if (!canRead) {
    return <main className="logistics-page"><section className="dl-container logistics-page__layout"><ErrorState title="Acces refuzat" description="Contul curent nu are permisiune pentru trasee." /></section></main>;
  }

  return (
    <main className="logistics-page">
      <section className="dl-container logistics-page__layout" aria-labelledby="route-title">
        <header className="logistics-page__header">
          <div>
            <h1 id="route-title">Traseu</h1>
            <p>Listele adăugate din Centrul operațional pot fi împărțite ulterior în trasee pentru curieri.</p>
          </div>
        </header>

        <div className="logistics-page__print-hide">
        <Card>
          <CardHeader>
            <CardTitle>Builder traseu</CardTitle>
            <CardDescription>Fără optimizare geografică automată.</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__content">
            <div className="logistics-page__filters">
              <TextInput label="Nume" onChange={(event) => setRouteName(event.target.value)} value={routeName} />
              <DateInput label="Data traseului" onChange={(event) => setRouteDate(event.target.value)} value={routeDate} />
              <Select
                label="Curier"
                onChange={(event) => setCourierUserId(event.target.value)}
                options={(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))}
                placeholder="Neasignat"
                value={courierUserId}
              />
            </div>

            <div className="logistics-page__route-grid">
                <CandidatePanel title="De livrat" loading={deliveryCandidatesQuery.isLoading}>
                {deliveryCandidates.filter((work) => work.requiresLogisticsAction && (work.requiresDelivery || work.logisticsActionReasons.includes("READY_FOR_PROBE_DELIVERY") || work.logisticsActionReasons.includes("READY_FOR_FINAL_DELIVERY")) && !assignedStopKeys.has(`DELIVERY:${work.id}`)).map((work) => (
                  <CandidateButton disabled={selectedKeys.has(`DELIVERY:${work.id}`)} key={work.id} label={`${work.workCode} · ${work.patientName}`} onClick={() => addDelivery(work)} />
                ))}
              </CandidatePanel>
              <CandidatePanel title="De ridicat" loading={pickupsQuery.isLoading}>
                {deliveryCandidates.filter((work) => work.requiresPickup && !assignedStopKeys.has(`PICKUP:${work.id}`)).map((work) => (
                  <CandidateButton disabled={selectedKeys.has(`PICKUP:${work.id}`)} key={`work-${work.id}`} label={`${work.workCode} · ${work.patientName}`} onClick={() => addPickupWork(work)} />
                ))}
                {pickupCandidates.filter((pickup) => !assignedStopKeys.has(`PICKUP:${pickup.id}`)).map((pickup) => (
                  <CandidateButton disabled={selectedKeys.has(`PICKUP:${pickup.id}`)} key={pickup.id} label={`${pickup.clinic.name} · ${pickup.scheduleLabel}`} onClick={() => addPickup(pickup)} />
                ))}
              </CandidatePanel>
              <Card>
                <CardHeader>
                  <CardTitle>Stopuri selectate</CardTitle>
                  <CardDescription>{selectedStops.length} stopuri</CardDescription>
                </CardHeader>
                <CardContent className="logistics-page__route-stops">
                  {selectedStops.map((stop, index) => (
                    <div className="logistics-page__route-stop" key={stop.id}>
                      <span>{index + 1}</span>
                      <strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong>
                      <strong className="logistics-page__route-location">{stop.location}</strong>
                      <p>{stop.label}</p>
                      <div className="logistics-page__route-stop-contact">
                        <input aria-label={`Adresa stop ${index + 1}`} onChange={(event) => setSelectedStops((current) => current.map((item) => item.id === stop.id ? { ...item, addressOverride: event.target.value } : item))} placeholder="Adresă (opțional)" value={stop.addressOverride ?? ""} />
                        <input aria-label={`Telefon stop ${index + 1}`} onChange={(event) => setSelectedStops((current) => current.map((item) => item.id === stop.id ? { ...item, phoneOverride: event.target.value } : item))} placeholder="Telefon (opțional)" value={stop.phoneOverride ?? ""} />
                      </div>
                      <div className="logistics-page__route-order-actions">
                        <Button disabled={index === 0} onClick={() => moveStop(stop.id, -1)} size="small" type="button" variant="ghost">Sus</Button>
                        <Button disabled={index === selectedStops.length - 1} onClick={() => moveStop(stop.id, 1)} size="small" type="button" variant="ghost">Jos</Button>
                      </div>
                      <Button onClick={() => removeStop(stop.id)} size="small" type="button" variant="ghost">Scoate</Button>
                    </div>
                  ))}
                  {selectedStops.length === 0 ? <p className="logistics-page__empty">Selectează lucrări sau ridicări în ordinea dorită.</p> : null}
                  <Button disabled={!canCreate || selectedStops.length === 0 || createRoute.isPending} onClick={submit} type="button">
                    {editingRouteId ? (editingRouteStatus === "DRAFT" ? "Creează traseu" : "Salvează lista") : courierUserId ? "Expediază lista" : "Adaugă în draft"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste și trasee în ziua selectată</CardTitle>
            <CardDescription>{visibleRoutes.length} elemente afișate</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__groups">
            <div className="logistics-page__print-controls">
              <DateWheelPicker label="Data listelor" value={listDate} onChange={(value) => { setListDate(value); setListRouteId(""); setPrintRouteId(null); }} />
              <div className="logistics-page__filter-field">
                <span className="logistics-page__filter-label">Curier</span>
                <Select
                  aria-label="Filtrare curier"
                  label=""
                  onChange={(event) => {
                    setListCourierId(event.target.value);
                    setListRouteId("");
                    setPrintRouteId(null);
                  }}
                  options={(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))}
                  placeholder="Toți curierii"
                  value={listCourierId}
                />
              </div>
              <Select label="Listă / traseu" onChange={(event) => { setListRouteId(event.target.value); setPrintRouteId(null); }} options={(routesQuery.data?.items ?? []).map((route) => ({ label: `${route.routeNumber} · ${route.name}`, value: route.id }))} placeholder="Toate" value={listRouteId} />
              <div className="logistics-page__print-actions">
                <Tooltip content="Printează traseele afișate">
                  <IconButton aria-label="Printează ziua" icon="⎙" onClick={() => printRoutes()} size="medium" variant="outline" />
                </Tooltip>
                <Tooltip content="Editează lista selectată">
                  <IconButton aria-label="Editează lista" disabled={!listRouteId} icon="✎" onClick={() => { const route = (routesQuery.data?.items ?? []).find((item) => item.id === listRouteId); if (route) editRoute(route); }} size="medium" variant="outline" />
                </Tooltip>
              </div>
            </div>
            {routesQuery.isLoading ? <LoadingState text="Se încarcă traseele" /> : null}
            {routesQuery.isError ? <ErrorState title="Traseele nu au fost încărcate" description={getErrorMessage(routesQuery.error)} /> : null}
              {visibleRoutes.map((route) => (
              <div className="logistics-page__group" key={route.id}>
                <div className="logistics-page__print-route-header">
                  <strong>{route.status === "DRAFT" ? "Listă" : "Traseu"} · {route.routeNumber} · {route.name}</strong>
                  <span>Data: {route.routeDate} · Curier: {route.courier?.name ?? "Neasignat"} · {route.stops.length} stopuri</span>
                </div>
                <span className="logistics-page__screen-only">{route.status} · versiunea {route.version}</span>
                <ol className="logistics-page__print-stops">{route.stops.map((stop) => <li key={stop.id}><strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><span>{stop.targetLabel}</span><span>Adresă: {stop.addressOverride || "-"}</span><span>Telefon: {stop.phoneOverride || "-"}</span></li>)}</ol>
                <div className="logistics-page__group-actions">
                  {route.status === "DRAFT" ? <Button onClick={() => editRoute(route)} size="small" type="button" variant="outline">Creează traseu</Button> : null}
                  {canAssign ? <Button onClick={() => startAssigning(route)} size="small" type="button" variant="outline">{route.courier ? "Schimbă curierul" : "Expediază curierului"}</Button> : null}
                  {assigningRouteId === route.id ? (
                    <>
                      <Select aria-label={`Curier pentru ${route.routeNumber}`} label="Curier" onChange={(event) => setAssigningCourierId(event.target.value)} options={(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))} placeholder="Selectează curierul" value={assigningCourierId} />
                      <Button disabled={updateRoute.isPending} onClick={() => assignRoute(route)} size="small" type="button">Trimite traseul</Button>
                    </>
                  ) : null}
                  {canCancel ? <Button disabled={deleteRoute.isPending} onClick={() => removeRoute(route)} size="small" type="button" variant="secondary">Șterge traseul</Button> : null}
                  <Tooltip content="Printează traseul">
                    <IconButton aria-label={`Printează traseul ${route.routeNumber}`} icon="⎙" onClick={() => printRoutes(route.id)} size="medium" variant="outline" />
                  </Tooltip>
                  <Tooltip content="Editează traseul">
                    <IconButton aria-label={`Editează traseul ${route.routeNumber}`} icon="✎" onClick={() => editRoute(route)} size="medium" variant="outline" />
                  </Tooltip>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function DateWheelPicker({ label, onChange, value }: { readonly label: string; readonly onChange: (value: string) => void; readonly value: string }): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const current = dateParts(value);
  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  const months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  const daysInMonth = new Date(Date.UTC(current.year, current.month + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  return <div className="logistics-page__date-picker">
    <span className="logistics-page__filter-label">{label}</span>
    <button aria-label={`Alege ${label}`} className="logistics-page__date-trigger" onClick={() => setIsOpen(true)} type="button">{String(current.day).padStart(2, "0")} {months[current.month]} {current.year}</button>
    {isOpen ? <div className="logistics-page__date-modal-backdrop" onMouseDown={() => setIsOpen(false)}>
      <section aria-label={label} aria-modal="true" className="logistics-page__date-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="logistics-page__date-modal-header"><strong>{label}</strong><strong className="logistics-page__date-modal-value">{String(current.day).padStart(2, "0")} {months[current.month]} {current.year}</strong><button aria-label="Închide selectorul de dată" onClick={() => setIsOpen(false)} type="button">×</button></div>
        <div className="logistics-page__date-wheel">
          <div className="logistics-page__date-wheel-column"><span>Zi</span><select aria-label={`${label} zi`} autoFocus onChange={(event) => onChange(composeDate(current.year, current.month, Number(event.target.value)))} size={5} value={current.day}>{days.map((day) => <option key={day} value={day}>{String(day).padStart(2, "0")}</option>)}</select></div>
          <div className="logistics-page__date-wheel-column"><span>Lună</span><select aria-label={`${label} lună`} onChange={(event) => onChange(composeDate(current.year, Number(event.target.value), current.day))} size={5} value={current.month}>{months.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></div>
          <div className="logistics-page__date-wheel-column"><span>An</span><select aria-label={`${label} an`} onChange={(event) => onChange(composeDate(Number(event.target.value), current.month, current.day))} size={5} value={current.year}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
        </div>
        <div className="logistics-page__date-modal-actions"><button onClick={() => { onChange(today()); setIsOpen(false); }} type="button">Azi</button><button onClick={() => setIsOpen(false)} type="button">Gata</button></div>
      </section>
    </div> : null}
  </div>;
}

function escapePrintText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function CandidatePanel({ children, loading, title }: { readonly children: ReactNode; readonly loading: boolean; readonly title: string }): ReactNode {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="logistics-page__route-candidates">
        {loading ? <LoadingState text="Se încarcă" /> : children}
      </CardContent>
    </Card>
  );
}

function CandidateButton({ disabled, label, onClick }: { readonly disabled: boolean; readonly label: string; readonly onClick: () => void }): ReactNode {
  return <Button disabled={disabled} onClick={onClick} type="button" variant="outline">{label}</Button>;
}
