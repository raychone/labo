import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const clinicName = "Clinica Dentară Aurora Demo SRL";
const doctorName = "Dr. Ioana Pavel";
export const smokeApiBaseUrl = (process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3010")
  .replace(/\/health(?:\/ready|\/live)?\/?$/, "")
  .replace(/\/$/, "");
export const smokeWebBaseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const patientSexValue = "MALE";
const shadeValue = "A2";
const smokeDateValue = "2026-08-15";
const toothValue = "11";
const preferredSmokeWorkTypeCode = "TECH-EX-09";

function futureDateValue(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

let realLabSheetPreparedForWorkTypeId: string | null = null;

const loginLabels: Record<"MANAGER" | "RECEPTIE" | "TEHNICIAN" | "LOGISTICA" | "CURIER", string> = {
  CURIER: "Intră ca curier",
  LOGISTICA: "Intră ca logistică",
  MANAGER: "Intră ca manager",
  RECEPTIE: "Intră ca recepție",
  TEHNICIAN: "Intră ca tehnician",
};

export interface SmokeWork {
  readonly code: string;
  readonly id: string;
  readonly patientName: string;
}

type ApiResponse<T> = T;

export async function loginAs(page: Page, role: keyof typeof loginLabels): Promise<void> {
  await logout(page);
  await page.goto("/login");
  await page.getByRole("button", { name: loginLabels[role] }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);
  // Keep the authenticated browser context while stopping dashboard queries
  // from competing with the API-driven fixture setup between UI assertions.
  await page.goto("about:blank");
}

export async function logout(page: Page): Promise<void> {
  const csrf = await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf");
  await browserJson(page, "/auth/logout", {
    headers: {
      "x-csrf-token": csrf.csrfToken,
    },
    method: "POST",
  });
}

export async function browserJson<T>(page: Page, path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await page.request.fetch(`${smokeApiBaseUrl}${path}`, {
    data: typeof init?.body === "string" && init.body.length > 0 ? JSON.parse(init.body) : undefined,
    headers: {
      ...(init?.headers ?? {}),
    },
    method: init?.method as "DELETE" | "GET" | "PATCH" | "POST" | "PUT" | undefined,
  });

  const text = await response.text();
  if (!response.ok()) {
    throw new Error(`${response.status()} ${text}`);
  }

  return text.length > 0 ? JSON.parse(text) as T : null;
}

async function mutateJson<T>(page: Page, path: string, method: "PATCH" | "POST" | "PUT", body?: unknown): Promise<T> {
  const csrfToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  return browserJson<T>(page, path, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method,
  });
}

async function ensureSmokeWorkTypeConfiguration(page: Page): Promise<{
  readonly template: { readonly fields: readonly { readonly key: string }[]; readonly id: string; readonly version: number };
  readonly workType: { readonly code: string; readonly id: string; readonly name: string };
}> {
  await loginAs(page, "MANAGER");
  const workTypes = await browserJson<readonly { readonly code: string; readonly id: string; readonly name: string }[]>(page, "/works/work-type-options");
  const workType = workTypes.find((candidate) => candidate.code === preferredSmokeWorkTypeCode) ?? workTypes[0];
  if (!workType) {
    throw new Error("Smoke setup requires at least one active work type.");
  }

  let template = await browserJson<{
    readonly fields: readonly { readonly key: string }[];
    readonly id: string;
    readonly version: number;
  } | null>(page, `/work-types/${workType.id}/form-template`);
  const fieldKeys = new Set((template?.fields ?? []).map((field) => field.key));
  if (!template || !fieldKeys.has("teeth") || !fieldKeys.has("shade")) {
    const draft = await mutateJson<{ readonly id: string }>(page, `/work-types/${workType.id}/form-templates`, "POST", {
      description: "Fixture Playwright pentru recepție.",
      kind: "GENERIC",
      name: "Formular smoke E2E",
    });
    await mutateJson(page, `/work-form-templates/${draft.id}/fields`, "PUT", {
      fields: [
        { key: "teeth", label: "Dinți", required: true, sortOrder: 1, type: "TOOTH" },
        {
          key: "shade",
          label: "Nuanță",
          options: [
            { label: "A1", value: "A1" },
            { label: "A2", value: "A2" },
            { label: "A3", value: "A3" },
            { label: "B1", value: "B1" },
          ],
          required: true,
          sortOrder: 2,
          type: "SHADE",
        },
      ],
    });
    template = await mutateJson(page, `/work-form-templates/${draft.id}/activate`, "POST");
  }

  const workflow = await browserJson<{
    readonly id: string;
    readonly stages: readonly { readonly allowedRoleCodes: readonly string[] }[];
  } | null>(page, `/work-types/${workType.id}/workflow-template`);
  const hasReceptionStage = (workflow?.stages ?? []).some((stage) => stage.allowedRoleCodes.includes("RECEPTIE"));
  const hasTechnicianStage = (workflow?.stages ?? []).some((stage) => stage.allowedRoleCodes.includes("TEHNICIAN"));
  if (!workflow || !hasReceptionStage || !hasTechnicianStage) {
    const draft = await mutateJson<{ readonly id: string }>(page, `/work-types/${workType.id}/workflow-templates`, "POST", {
      description: "Fixture Playwright pentru fluxul recepție–tehnician.",
      name: "Flux smoke E2E",
    });
    await mutateJson(page, `/workflow-templates/${draft.id}/stages`, "PUT", {
      stages: [
        {
          allowedRoleCodes: ["RECEPTIE", "MANAGER"],
          isFinal: false,
          isInitial: true,
          key: "receptie_smoke",
          name: "Recepție",
          sortOrder: 1,
        },
        {
          allowedRoleCodes: ["TEHNICIAN", "MANAGER"],
          isFinal: true,
          isInitial: false,
          key: "productie_smoke",
          name: "Producție",
          sortOrder: 2,
        },
      ],
    });
    await mutateJson(page, `/workflow-templates/${draft.id}/activate`, "POST");
  }

  if (realLabSheetPreparedForWorkTypeId !== workType.id) {
    const draft = await mutateJson<{ readonly id: string }>(page, `/work-types/${workType.id}/form-templates`, "POST", {
      description: "Fixture Playwright pentru fișa pe ciclu.",
      kind: "REAL_LAB_SHEET",
      name: "Fișă laborator smoke E2E",
    });
    await mutateJson(page, `/work-form-templates/${draft.id}/fields`, "PUT", {
      fields: [
        {
          copyToNextCyclePolicy: "NEVER",
          cycleScope: "CYCLE",
          editableUntil: "CYCLE_FINALIZED",
          key: "observatie_tehnica",
          label: "Observație tehnică",
          printable: true,
          required: false,
          roleOwner: "TECHNICIAN",
          sortOrder: 1,
          sourceKind: "USER_ENTERED",
          type: "TEXT",
        },
      ],
    });
    await mutateJson(page, `/work-form-templates/${draft.id}/activate`, "POST");
    realLabSheetPreparedForWorkTypeId = workType.id;
  }

  await loginAs(page, "RECEPTIE");
  return { template, workType };
}

export async function seedSmokeWork(page: Page): Promise<SmokeWork> {
  const clinics = await browserJson<readonly { readonly id: string; readonly name: string }[]>(page, "/clinics/options");
  let clinic: { readonly id: string; readonly name: string } | undefined;
  let doctor: { readonly id: string; readonly displayName: string } | undefined;
  for (const candidateClinic of clinics) {
    const candidateDoctors = await browserJson<readonly { readonly id: string; readonly displayName: string }[]>(
      page,
      `/doctors/options?clinicId=${encodeURIComponent(candidateClinic.id)}`,
    );
    if (candidateDoctors[0]) {
      clinic = candidateClinic;
      doctor = candidateDoctors[0];
      break;
    }
  }
  if (!clinic || !doctor) {
    throw new Error("Smoke setup requires at least one clinic with an available doctor.");
  }

  const { template, workType } = await ensureSmokeWorkTypeConfiguration(page);

  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const patient = await browserJson<{
    readonly overview: { readonly id: string; readonly fullName: string };
  }>(page, "/patients", {
    body: JSON.stringify({
      birthDate: null,
      clinicId: clinic!.id,
      doctorId: doctor!.id,
      firstName: "Smoke",
      lastName: `Patient ${uniqueSuffix}`,
      notes: null,
      sex: patientSexValue,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });

  const created = await browserJson<{ readonly code: string; readonly id: string }>(page, "/works", {
    body: JSON.stringify({
      clinicId: clinic!.id,
      doctorId: doctor!.id,
      patientId: patient.overview.id,
      priority: "NORMAL",
      quantity: 1,
      requestedDeliveryDate: futureDateValue(14),
      items: [{
        implantPlatform: null,
        notes: null,
        restorationType: null,
        scope: "TOOTH",
        shade: shadeValue,
        technicalCodeNotes: null,
        teeth: [Number(toothValue)],
        workTypeId: workType!.id,
      }],
      workFormSubmission: {
        templateId: template!.id,
        templateVersion: template!.version,
        values: {
          teeth: [toothValue],
          shade: shadeValue,
        },
      },
      workTypeId: workType!.id,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });

  return { code: created.code, id: created.id, patientName: patient.overview.fullName };
}

export async function startCurrentWorkflowStage(page: Page, workId: string): Promise<void> {
  const workflow = await browserJson<{
    readonly currentStage: null | {
      readonly id: string;
      readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
      readonly version: number;
    };
    readonly version: number;
  } | null>(page, `/works/${workId}/workflow`);
  if (!workflow?.currentStage || workflow.currentStage.status !== "PENDING") {
    return;
  }

  await browserJson(page, `/works/${workId}/workflow/stages/${workflow.currentStage.id}/start`, {
    body: JSON.stringify({
      expectedStageVersion: workflow.currentStage.version,
      expectedWorkflowVersion: workflow.version,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
}

export async function completeCurrentWorkflowStage(page: Page, workId: string): Promise<void> {
  const workflow = await browserJson<{
    readonly currentStage: null | {
      readonly id: string;
      readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
      readonly version: number;
    };
    readonly version: number;
  } | null>(page, `/works/${workId}/workflow`);
  if (!workflow?.currentStage || workflow.currentStage.status !== "IN_PROGRESS") {
    return;
  }

  await browserJson(page, `/works/${workId}/workflow/stages/${workflow.currentStage.id}/complete`, {
    body: JSON.stringify({
      expectedStageVersion: workflow.currentStage.version,
      expectedWorkflowVersion: workflow.version,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
}

const workflowRoleLoginPriority = ["Recepție", "Tehnician", "Logistică", "Manager", "Curier"] as const;

const workflowRoleLogins: Record<(typeof workflowRoleLoginPriority)[number], keyof typeof loginLabels> = {
  Curier: "CURIER",
  Logistică: "LOGISTICA",
  Manager: "MANAGER",
  Recepție: "RECEPTIE",
  Tehnician: "TEHNICIAN",
};

function resolveWorkflowRoleLogin(allowedRoleLabels: readonly string[]): keyof typeof loginLabels | null {
  for (const roleLabel of workflowRoleLoginPriority) {
    if (allowedRoleLabels.includes(roleLabel)) {
      return workflowRoleLogins[roleLabel];
    }
  }
  return null;
}

export async function completeWorkflowUntilDone(page: Page, work: SmokeWork): Promise<void> {
  const workId = work.id;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const workflow = await browserJson<{
      readonly currentStage: null | {
        readonly allowedRoleLabels: readonly string[];
        readonly assignment: {
          readonly assignedUser: { readonly id: string } | null;
        };
        readonly id: string;
        readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
        readonly version: number;
      };
    } | null>(page, `/works/${workId}/workflow`);
    if (!workflow?.currentStage || workflow.currentStage.status === "COMPLETED") {
      return;
    }

    if (!resolveWorkflowRoleLogin(workflow.currentStage.allowedRoleLabels)) {
      throw new Error(`No supported login role matches workflow stage labels ${workflow.currentStage.allowedRoleLabels.join(", ")}`);
    }
    const usesTechnicianRole = workflow.currentStage.allowedRoleLabels.includes("Tehnician");
    await loginAs(page, usesTechnicianRole ? "TEHNICIAN" : "MANAGER");
    if (workflow.currentStage.status === "PENDING") {
      if (usesTechnicianRole && !workflow.currentStage.assignment.assignedUser) {
        const available = await browserJson<{
          readonly items: readonly {
            readonly claim: { readonly revision: number };
            readonly id: string;
          }[];
        }>(page, `/works/available-for-claim?page=1&pageSize=100&search=${encodeURIComponent(work.code)}`);
        const claimBefore = available.items.find((candidate) => candidate.id === workId);
        if (!claimBefore) {
          throw new Error(`Work ${work.code} is not available for technician claim.`);
        }
        await mutateJson(page, `/works/${workId}/claim`, "POST", {
          expectedClaimRevision: claimBefore.claim.revision,
        });
      }
      await startCurrentWorkflowStage(page, workId);
      continue;
    }
    await completeCurrentWorkflowStage(page, workId);
  }

  throw new Error(`Workflow did not complete for work ${workId}`);
}

export async function completeWorkflowStagesForRole(page: Page, workId: string, roleLabel: string): Promise<void> {
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const workflow = await browserJson<{
      readonly currentStage: null | {
        readonly allowedRoleLabels: readonly string[];
        readonly id: string;
        readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
        readonly version: number;
      };
    } | null>(page, `/works/${workId}/workflow`);
    if (!workflow?.currentStage || !workflow.currentStage.allowedRoleLabels.includes(roleLabel)) {
      return;
    }
    if (workflow.currentStage.status === "PENDING") {
      await startCurrentWorkflowStage(page, workId);
      continue;
    }
    if (workflow.currentStage.status === "IN_PROGRESS") {
      await completeCurrentWorkflowStage(page, workId);
      continue;
    }
    return;
  }

  throw new Error(`Workflow stage for role ${roleLabel} did not complete for work ${workId}`);
}

export function createSmokeRealLabSheetValues(fields: readonly {
  readonly key: string;
  readonly label: string;
  readonly options: readonly { readonly label: string; readonly value: string }[];
  readonly sourceKind?: string;
  readonly type: string;
}[]): Record<string, boolean | number | readonly string[] | string> {
  const values: Record<string, boolean | number | readonly string[] | string> = {};
  for (const field of fields) {
    if (field.sourceKind !== "USER_ENTERED") {
      continue;
    }
    if (field.type === "CHECKBOX") {
      values[field.key] = true;
      continue;
    }
    if (field.type === "NUMBER") {
      values[field.key] = 1;
      continue;
    }
    if (field.type === "DATE" || field.type === "DATETIME" || field.label.toLowerCase().includes("termen") || field.key.toLowerCase().includes("termen")) {
      values[field.key] = smokeDateValue;
      continue;
    }
    if (field.key.toLowerCase().includes("sex") || field.label.toLowerCase().includes("sex")) {
      values[field.key] = field.options[0]?.value ?? patientSexValue;
      continue;
    }
    if (field.type === "TOOTH") {
      values[field.key] = [toothValue];
      continue;
    }
    if (field.key.toLowerCase().includes("shade") || field.type === "SHADE") {
      values[field.key] = shadeValue;
      continue;
    }
    if (field.type === "MULTISELECT") {
      values[field.key] = [field.options[0]?.value ?? field.label];
      continue;
    }
    if (field.options.length > 0) {
      values[field.key] = field.options[0]!.value;
      continue;
    }
    values[field.key] = `${field.label} smoke`;
  }
  return values;
}

export async function saveSmokeRealLabSheet(page: Page, workId: string): Promise<void> {
  const cycles = await browserJson<{
    readonly activeCycleId: string | null;
    readonly cycles: readonly { readonly id: string }[];
  }>(page, `/works/${workId}/cycles`);
  const cycleId = cycles.activeCycleId ?? cycles.cycles[0]?.id;
  expect(cycleId, "Missing active cycle for real lab sheet").toBeTruthy();
  const sheet = await browserJson<{
    readonly fields: readonly {
      readonly key: string;
      readonly label: string;
      readonly options: readonly { readonly label: string; readonly value: string }[];
      readonly revision: number;
      readonly sourceKind?: string;
      readonly type: string;
      readonly templateId: string | null;
      readonly templateVersion: number;
    }[];
  }>(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet`);
  const values = createSmokeRealLabSheetValues(sheet.fields ?? []);
  const draft = await mutateJson<{
    readonly revision: number;
  }>(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet`, "PATCH", {
      expectedRevision: sheet.revision,
      saveMode: "DRAFT",
      templateId: sheet.templateId ?? "",
      templateVersion: sheet.templateVersion,
      values,
  });
  const completed = await mutateJson<{
    readonly revision: number;
  }>(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet`, "PATCH", {
      expectedRevision: draft.revision,
      saveMode: "COMPLETE",
      templateId: sheet.templateId ?? "",
      templateVersion: sheet.templateVersion,
      values,
  });
  await mutateJson(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet/finalize`, "POST", {
      expectedRevision: completed.revision,
  });
}

export async function deliverSmokeCycle(
  page: Page,
  work: SmokeWork,
  recipientName: string,
  recipientRole: string,
  technicalOutcome: "FINALIZED" | "PROBE_READY" = "FINALIZED",
  executionLegalEntityCode?: "CDT" | "NG",
): Promise<{ readonly deliveryId: string }> {
  await loginAs(page, "RECEPTIE");
  await completeWorkflowStagesForRole(page, work.id, "Recepție");

  await loginAs(page, "TEHNICIAN");
  await page.goto("/workbench");
  await expect(page.getByRole("heading", { name: "Atelier tehnician" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Lucrări de preluat", exact: true }).click();
  await page.getByRole("searchbox", { name: "Căutare" }).fill(work.code);
  await expect(page.getByRole("article").filter({ hasText: work.code })).toBeVisible({ timeout: 20_000 });

  const available = await browserJson<{
    readonly items: readonly {
      readonly claim: { readonly revision: number };
      readonly id: string;
    }[];
  }>(page, `/works/available-for-claim?page=1&pageSize=100&search=${encodeURIComponent(work.code)}`);
  const workBeforeClaim = available.items.find((candidate) => candidate.id === work.id);
  if (!workBeforeClaim) {
    throw new Error(`Work ${work.code} is not available for technician claim.`);
  }
  await mutateJson(page, `/works/${work.id}/claim`, "POST", {
    ...(executionLegalEntityCode ? { executionLegalEntityCode } : {}),
    expectedClaimRevision: workBeforeClaim.claim.revision,
  });

  const operations = await browserJson<readonly {
    readonly id: string;
    readonly rateMinor?: number | null;
  }[]>(page, `/technician-operations/options?workOrderId=${encodeURIComponent(work.id)}`);
  const operation = operations.find((candidate) => candidate.rateMinor !== null && candidate.rateMinor !== undefined);
  if (!operation) {
    throw new Error(`Work ${work.code} has no compatible technician operation with an active rate.`);
  }
  await mutateJson(page, "/technician-operations/performed", "POST", {
    operationId: operation.id,
    selectedTeeth: [Number(toothValue)],
    workOrderId: work.id,
  });

  await loginAs(page, "TEHNICIAN");
  await completeWorkflowUntilDone(page, work);
  await loginAs(page, "TEHNICIAN");
  await mutateJson(
    page,
    technicalOutcome === "PROBE_READY" ? `/works/${work.id}/probe-ready` : `/works/${work.id}/finalize`,
    "POST",
    {},
  );

  await loginAs(page, "LOGISTICA");
  await page.goto("/logistics");
  const workForDelivery = await browserJson<{
    readonly clinic: { readonly id: string };
  }>(page, `/works/${work.id}`);
  const preparationGroup = await mutateJson<{
    readonly delivery: null | { readonly id: string };
    readonly id: string;
    readonly plannedDate: string | null;
    readonly status: "DRAFT" | "READY" | "CANCELLED";
  }>(page, "/delivery-preparation-groups", "POST", {
    clinicId: workForDelivery.clinic.id,
  });
  await mutateJson(page, `/delivery-preparation-groups/${preparationGroup.id}/works`, "POST", {
    workOrderId: work.id,
  });
  if (preparationGroup.status === "DRAFT") {
    await mutateJson(page, `/delivery-preparation-groups/${preparationGroup.id}/mark-ready`, "POST", {});
  }
  const delivery = preparationGroup.delivery
    ? await browserJson<{
        readonly id: string;
        readonly version: number;
      }>(page, `/deliveries/${preparationGroup.delivery.id}`)
    : await mutateJson<{
        readonly id: string;
        readonly version: number;
      }>(page, `/delivery-preparation-groups/${preparationGroup.id}/delivery`, "POST", {
        courierUserId: "demo_user_curier",
        plannedDate: preparationGroup.plannedDate ?? new Date().toISOString(),
      });

  await loginAs(page, "CURIER");
  await page.goto("/deliveries");
  const deliveryToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  await browserJson(page, `/deliveries/${delivery.id}/pickup`, {
    body: JSON.stringify({ version: delivery.version }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": deliveryToken,
    },
    method: "POST",
  });
  const pickedUpDelivery = await browserJson<{
    readonly id: string;
    readonly version: number;
  }>(page, `/deliveries/${delivery.id}`);
  await browserJson(page, `/deliveries/${delivery.id}/start-transit`, {
    body: JSON.stringify({ version: pickedUpDelivery.version }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": deliveryToken,
    },
    method: "POST",
  });
  await page.goto(`/deliveries?deliveryId=${delivery.id}`);
  await page.getByLabel("Nume primitor").fill(recipientName);
  await page.getByLabel("Rol primitor").fill(recipientRole);
  await page.getByRole("button", { name: "Confirmă livrarea" }).click();
  const confirmationDialog = page.getByRole("dialog", { name: "Confirmare internă de primire", exact: true });
  const signaturePad = confirmationDialog.getByLabel(/Semnătura destinatarului/i);
  await expect(signaturePad).toBeVisible();
  const signatureBox = await signaturePad.boundingBox();
  expect(signatureBox, "Missing signature canvas bounds").toBeTruthy();
  if (signatureBox) {
    const startX = signatureBox.x + signatureBox.width * 0.1;
    const startY = signatureBox.y + signatureBox.height * 0.35;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(signatureBox.x + signatureBox.width * 0.35, signatureBox.y + signatureBox.height * 0.55, { steps: 8 });
    await page.mouse.move(signatureBox.x + signatureBox.width * 0.55, signatureBox.y + signatureBox.height * 0.25, { steps: 8 });
    await page.mouse.move(signatureBox.x + signatureBox.width * 0.75, signatureBox.y + signatureBox.height * 0.6, { steps: 8 });
    await page.mouse.move(signatureBox.x + signatureBox.width * 0.9, signatureBox.y + signatureBox.height * 0.4, { steps: 8 });
    await page.mouse.up();
  }
  const handoverConfirmationLabel = "Confirm că lucrările afișate au fost predate persoanei menționate.";
  const handoverConfirmation = confirmationDialog.getByLabel(handoverConfirmationLabel);
  await confirmationDialog.getByText(handoverConfirmationLabel, { exact: true }).click();
  await expect(handoverConfirmation).toBeChecked();
  const completedResponsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/deliveries/${delivery.id}/complete`
  ));
  await confirmationDialog.getByRole("button", { name: "Confirmă predarea" }).click();
  const completedResponse = await completedResponsePromise;
  expect(completedResponse.ok(), `Delivery completion failed with HTTP ${completedResponse.status()}`).toBe(true);

  if (technicalOutcome === "PROBE_READY") {
    await completePickupAfterProbeDelivery(page, work);
  }

  return { deliveryId: delivery.id };
}

async function completePickupAfterProbeDelivery(page: Page, work: SmokeWork): Promise<void> {
  await loginAs(page, "LOGISTICA");
  const workDetail = await browserJson<{
    readonly clinic: { readonly id: string };
    readonly doctor: { readonly id: string } | null;
  }>(page, `/works/${work.id}`);
  const pickup = await mutateJson<{ readonly id: string }>(page, "/pickup-requests", "POST", {
    clinicId: workDetail.clinic.id,
    doctorId: workDetail.doctor?.id ?? null,
    exactTime: "12:00",
    scheduleType: "EXACT",
    scheduledDate: futureDateValue(0),
  });
  const route = await mutateJson<{
    readonly id: string;
    readonly status: string;
    readonly stops: readonly { readonly id: string; readonly pickupRequestId: string | null }[];
  }>(page, "/routes", "POST", {
    name: `Smoke pickup ${work.code}`,
    routeDate: futureDateValue(0),
    stops: [{ pickupRequestId: pickup.id, type: "PICKUP" }],
  });
  expect(route.status).toBe("DRAFT");
  const stop = route.stops.find((candidate) => candidate.pickupRequestId === pickup.id);
  expect(stop, `Missing pickup stop for ${work.code}`).toBeTruthy();
  const started = await mutateJson<{ readonly status: string }>(page, `/routes/${route.id}/start`, "POST");
  expect(started.status).toBe("IN_PROGRESS");
  const completed = await mutateJson<{
    readonly status: string;
    readonly stops: readonly { readonly id: string; readonly outcomeStatus: string }[];
  }>(page, `/routes/${route.id}/stops/${stop!.id}/outcome`, "POST", {
    outcomeStatus: "PICKED_UP",
  });
  expect(completed.status).toBe("COMPLETED");
  expect(completed.stops.find((candidate) => candidate.id === stop!.id)?.outcomeStatus).toBe("PICKED_UP");
}

export async function switchToWorkExecutionCompany(page: Page, workId: string): Promise<"CDT" | "NG"> {
  const history = await browserJson<{
    readonly activeCycleId: string | null;
    readonly cycles: readonly {
      readonly executionCompany: { readonly code: string } | null;
      readonly id: string;
    }[];
  }>(page, `/works/${workId}/cycles`);
  const activeCycle = history.cycles.find((cycle) => cycle.id === history.activeCycleId);
  const code = activeCycle?.executionCompany?.code;
  if (code !== "CDT" && code !== "NG") {
    throw new Error(`Work ${workId} has no supported execution company on its active cycle.`);
  }

  await mutateJson(page, "/organization-context", "PUT", { code });
  return code;
}

export async function registerReturnFromDashboard(page: Page, work: SmokeWork): Promise<void> {
  await loginAs(page, "RECEPTIE");
  await page.goto("/dashboard");
  const workDetail = await browserJson<{ readonly clinic: { readonly id: string } }>(page, `/works/${work.id}`);
  await page.getByRole("button", { name: "Probe", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Înregistrează revenirea", exact: true });
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await dialog.getByLabel(/^Clinică/).selectOption(workDetail.clinic.id);
  const workButton = dialog.getByRole("button").filter({ hasText: work.code }).first();
  await expect(workButton).toBeVisible({ timeout: 20_000 });
  await workButton.click();
  await expect(dialog).toContainText(work.code, { timeout: 20_000 });
  const firstProbeType = dialog.getByRole("group", { name: "Tipuri probă" }).getByRole("checkbox").first();
  await expect(firstProbeType).toBeVisible({ timeout: 20_000 });
  await firstProbeType.check();
  await dialog.getByLabel(/^Data termenului probei/).fill(futureDateValue(7));
  const submit = dialog.getByRole("button", { name: "Înregistrează proba", exact: true });
  await expect(submit).toBeEnabled({ timeout: 20_000 });
  const responsePromise = page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/works/${work.id}/probe-cycles/receive`
  ));
  await submit.click();
  const response = await responsePromise;
  expect(response.ok(), `Probe return failed with HTTP ${response.status()}`).toBe(true);
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}

export async function getWorkCycles(page: Page, workId: string): Promise<{
  readonly activeCycleId: string | null;
  readonly cycles: readonly { readonly cycleNumber: number; readonly id: string }[];
}> {
  return await browserJson(page, `/works/${workId}/cycles`);
}

export async function getProbeCycleState(page: Page, workId: string): Promise<{
  readonly activeProbeCycle: { readonly id: string; readonly sequence: number } | null;
  readonly completedProbeCycles: readonly { readonly id: string; readonly sequence: number }[];
}> {
  return await browserJson(page, `/works/${workId}`);
}
