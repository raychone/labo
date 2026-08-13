import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const clinicName = "Clinica Dentară Aurora Demo SRL";
const doctorName = "Dr. Ioana Pavel";
const apiBaseUrl = "http://127.0.0.1:3010";
const patientSexValue = "MALE";
const shadeValue = "A2";
const smokeDateValue = "2026-08-15";
const toothValue = "11";
const workTypeName = "Bont implant demo";

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
}

export async function logout(page: Page): Promise<void> {
  try {
    const csrf = await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf");
    await browserJson(page, "/auth/logout", {
      headers: {
        "x-csrf-token": csrf.csrfToken,
      },
      method: "POST",
    });
  } catch {
    // Ignore anonymous sessions or transient logout failures in smoke setup.
  }
}

export async function browserJson<T>(page: Page, path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await page.request.fetch(`${apiBaseUrl}${path}`, {
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

export async function seedSmokeWork(page: Page): Promise<SmokeWork> {
  const clinics = await browserJson<readonly { readonly id: string; readonly name: string }[]>(page, "/clinics/options");
  const clinic = clinics[0];
  expect(clinic, "Missing clinic options").toBeTruthy();

  const doctors = await browserJson<readonly { readonly id: string; readonly displayName: string }[]>(page, `/doctors/options?clinicId=${encodeURIComponent(clinic!.id)}`);
  const doctor = doctors[0];
  expect(doctor, "Missing doctor options").toBeTruthy();

  const workTypes = await browserJson<readonly { readonly code: string; readonly id: string; readonly name: string }[]>(page, "/works/work-type-options");
  let workType: { readonly code: string; readonly id: string; readonly name: string } | undefined;
  let template: { readonly fields: readonly { readonly key: string }[]; readonly id: string; readonly version: number } | null = null;
  for (const candidate of workTypes) {
    const candidateTemplate = await browserJson<{ readonly fields: readonly { readonly key: string }[]; readonly id: string; readonly version: number } | null>(page, `/work-types/${candidate.id}/form-template`);
    const candidateFieldKeys = new Set((candidateTemplate?.fields ?? []).map((field) => field.key));
    const candidateWorkflow = await browserJson<{
      readonly id: string;
      readonly stages: readonly {
        readonly allowedRoleCodes: readonly string[];
        readonly sortOrder: number;
      }[];
    } | null>(page, `/work-types/${candidate.id}/workflow-template`);
    const hasReceptionStage = (candidateWorkflow?.stages ?? []).some((stage) => stage.allowedRoleCodes.includes("RECEPTIE"));
    const hasTechnicianStage = (candidateWorkflow?.stages ?? []).some((stage) => stage.allowedRoleCodes.includes("TEHNICIAN"));
    if (candidateTemplate && candidateFieldKeys.has("teeth") && candidateFieldKeys.has("shade") && hasReceptionStage && hasTechnicianStage) {
      workType = candidate;
      template = candidateTemplate;
      break;
    }
  }
  if (!workType || !template) {
    throw new Error(`workTypes=${JSON.stringify(workTypes.map((item) => ({ code: item.code, id: item.id, name: item.name })), null, 2)}`);
  }

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
      requestedDeliveryDate: "2026-08-20",
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

export async function completeWorkflowUntilDone(page: Page, workId: string): Promise<void> {
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
        const workClaim = await browserJson<{
          readonly claim: {
            readonly revision: number;
            readonly status: "CLAIMED" | "UNCLAIMED";
          };
        }>(page, `/works/${workId}`);
        const csrfToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
        if (workClaim.claim.status === "CLAIMED") {
          await browserJson(page, `/works/${workId}/release`, {
            body: JSON.stringify({
              expectedClaimRevision: workClaim.claim.revision,
              reason: "Smoke handoff",
            }),
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfToken,
            },
            method: "POST",
          });
        }
        const claimBefore = await browserJson<{
          readonly claim: {
            readonly revision: number;
          };
        }>(page, `/works/${workId}`);
        await browserJson(page, `/works/${workId}/claim`, {
          body: JSON.stringify({
            executionLegalEntityCode: "NC",
            expectedClaimRevision: claimBefore.claim.revision,
          }),
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          method: "POST",
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
  const csrfToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  const draft = await browserJson<{
    readonly revision: number;
  }>(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet`, {
    body: JSON.stringify({
      expectedRevision: sheet.revision,
      saveMode: "DRAFT",
      templateId: sheet.templateId ?? "",
      templateVersion: sheet.templateVersion,
      values,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PATCH",
  });
  const completed = await browserJson<{
    readonly revision: number;
  }>(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet`, {
    body: JSON.stringify({
      expectedRevision: draft.revision,
      saveMode: "COMPLETE",
      templateId: sheet.templateId ?? "",
      templateVersion: sheet.templateVersion,
      values,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PATCH",
  });
  await browserJson(page, `/works/${workId}/cycles/${cycleId}/real-lab-sheet/finalize`, {
    body: JSON.stringify({
      expectedRevision: completed.revision,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });
}

export async function deliverSmokeCycle(page: Page, work: SmokeWork, recipientName: string, recipientRole: string): Promise<{ readonly deliveryId: string }> {
  await loginAs(page, "RECEPTIE");
  await completeWorkflowStagesForRole(page, work.id, "Recepție");

  await loginAs(page, "TEHNICIAN");
  await page.goto("/workbench");
  await expect(page.getByRole("heading", { name: "Atelier tehnician" })).toBeVisible();
  await page.getByRole("button", { name: "Lucrările mele" }).click();

  const workBeforeClaim = await browserJson<{
    readonly claim: {
      readonly revision: number;
      readonly status: "CLAIMED" | "UNCLAIMED";
    };
  }>(page, `/works/${work.id}`);
  await browserJson(page, `/works/${work.id}/claim`, {
    body: JSON.stringify({
      executionLegalEntityCode: "NC",
      expectedClaimRevision: workBeforeClaim.claim.revision,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  await loginAs(page, "TEHNICIAN");
  await completeWorkflowUntilDone(page, work.id);

  await loginAs(page, "LOGISTICA");
  await page.goto("/logistics");
  const workLogistics = await browserJson<{
    readonly logistics: {
      readonly status: string;
      readonly version: number;
    };
  }>(page, `/works/${work.id}/logistics`);
  await browserJson(page, `/works/${work.id}/logistics/ready-for-packing`, {
    body: JSON.stringify({ version: workLogistics.logistics.version }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  const workLogisticsReady = await browserJson<{
    readonly logistics: {
      readonly version: number;
    };
  }>(page, `/works/${work.id}/logistics`);
  await browserJson(page, `/works/${work.id}/logistics/start-packing`, {
    body: JSON.stringify({ version: workLogisticsReady.logistics.version }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  const workLogisticsPacking = await browserJson<{
    readonly logistics: {
      readonly version: number;
    };
  }>(page, `/works/${work.id}/logistics`);
  await browserJson(page, `/works/${work.id}/logistics/complete-packing`, {
    body: JSON.stringify({ version: workLogisticsPacking.logistics.version }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  const workForDelivery = await browserJson<{
    readonly clinic: { readonly id: string };
  }>(page, `/works/${work.id}`);
  const logisticsView = await browserJson<{
    readonly preparationGroup: null | {
      readonly id: string;
      readonly status: "DRAFT" | "READY" | "CANCELLED";
    };
  }>(page, `/works/${work.id}/logistics`);
  const logisticsToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  const preparationGroup = logisticsView.preparationGroup ?? await browserJson<{
    readonly id: string;
    readonly plannedDate: string | null;
  }>(page, "/delivery-preparation-groups", {
    body: JSON.stringify({
      clinicId: workForDelivery.clinic.id,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": logisticsToken,
    },
    method: "POST",
  });
  if (!logisticsView.preparationGroup) {
    await browserJson(page, `/delivery-preparation-groups/${preparationGroup.id}/works`, {
      body: JSON.stringify({ workOrderId: work.id }),
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": logisticsToken,
      },
      method: "POST",
    });
  }
  if (preparationGroup.status === "DRAFT") {
    await browserJson(page, `/delivery-preparation-groups/${preparationGroup.id}/mark-ready`, {
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": logisticsToken,
      },
      method: "POST",
    });
  }
  const delivery = preparationGroup.delivery
    ? await browserJson<{
        readonly id: string;
        readonly version: number;
      }>(page, `/deliveries/${preparationGroup.delivery.id}`)
    : await browserJson<{
        readonly id: string;
        readonly version: number;
      }>(page, `/delivery-preparation-groups/${preparationGroup.id}/delivery`, {
        body: JSON.stringify({
          courierUserId: "demo_user_curier",
          plannedDate: preparationGroup.plannedDate ?? new Date().toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": logisticsToken,
        },
        method: "POST",
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
  const signaturePad = page.getByLabel(/Semnătura destinatarului/i);
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
  await page.getByLabel("Confirm că lucrările afișate au fost predate persoanei menționate.").check();
  await page.getByRole("button", { name: "Confirmă predarea" }).click();

  await loginAs(page, "MANAGER");
  const closeGroupToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  await browserJson(page, `/delivery-preparation-groups/${preparationGroup.id}/cancel`, {
    body: "{}",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": closeGroupToken,
    },
    method: "POST",
  });

  return { deliveryId: delivery.id };
}

export async function registerReturnFromDashboard(page: Page, work: SmokeWork): Promise<void> {
  await loginAs(page, "RECEPTIE");
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Înregistrează revenirea" }).click();
  const dialog = page.getByRole("dialog", { name: "Înregistrează revenirea" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Caută lucrare finalizată").fill(work.code);
  const workButton = dialog.getByRole("button", { name: new RegExp(work.code) }).first();
  await expect(workButton).toBeVisible();
  await workButton.click();
  await dialog.getByRole("button", { name: "Marchează revenită" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}

export async function getWorkCycles(page: Page, workId: string): Promise<{
  readonly activeCycleId: string | null;
  readonly cycles: readonly { readonly cycleNumber: number; readonly id: string }[];
}> {
  return await browserJson(page, `/works/${workId}/cycles`);
}
