import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { FieldErrors, FieldValues, Path, UseFormReturn } from "react-hook-form";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router";
import { ConfirmActionModal, type FormErrorSummaryItem } from "@dental-lab/ui";

import { ApiError } from "./api-client.js";

export const unsavedChangesMessage = "Ai modificari nesalvate. Daca parasesti pagina, acestea se vor pierde.";

export interface NormalizedApiError {
  readonly code: string | undefined;
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;
  readonly message: string;
  readonly status: number | undefined;
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      fieldErrors: error.fieldErrors,
      message: error.message,
      status: error.status,
    };
  }

  if (error instanceof TypeError) {
    return {
      code: "NETWORK_ERROR",
      fieldErrors: {},
      message: "Conexiunea la server a esuat. Verifica reteaua si incearca din nou.",
      status: undefined,
    };
  }

  if (error instanceof Error) {
    return {
      code: undefined,
      fieldErrors: {},
      message: error.message,
      status: undefined,
    };
  }

  return {
    code: undefined,
    fieldErrors: {},
    message: "Actiunea a esuat.",
    status: undefined,
  };
}

export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message;
}

export function applyApiErrorsToForm<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: unknown,
): void {
  const normalizedError = normalizeApiError(error);
  const fieldEntries = Object.entries(normalizedError.fieldErrors);

  if (fieldEntries.length === 0) {
    form.setError("root.server", { message: normalizedError.message });
    return;
  }

  for (const [fieldName, messages] of fieldEntries) {
    form.setError(fieldName as Path<TValues>, { message: messages.join(" ") });
  }
}

function getErrorMessageFromValue(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const maybeMessage = (value as { readonly message?: unknown }).message;

  return typeof maybeMessage === "string" ? maybeMessage : undefined;
}

export function getFormErrorSummaryItems<TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  fieldLabels: Partial<Record<keyof TValues & string, string>>,
): readonly FormErrorSummaryItem[] {
  const items: FormErrorSummaryItem[] = [];

  for (const [fieldName, value] of Object.entries(errors)) {
    if (fieldName === "root") {
      const rootMessage = getErrorMessageFromValue(value) ?? getErrorMessageFromValue((value as { readonly server?: unknown }).server);
      if (rootMessage) {
        items.push({ message: rootMessage });
      }
      continue;
    }

    const message = getErrorMessageFromValue(value);
    if (message) {
      const label = fieldLabels[fieldName as keyof TValues & string] ?? fieldName;
      items.push({ fieldId: fieldName, message: `${label}: ${message}` });
    }
  }

  return items;
}

export function focusFirstInvalidField<TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  summaryElement: HTMLElement | null,
): void {
  const firstFieldName = Object.keys(errors).find((fieldName) => fieldName !== "root");

  if (!firstFieldName) {
    summaryElement?.focus();
    return;
  }

  const element = document.getElementById(firstFieldName);
  if (element instanceof HTMLElement) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    return;
  }

  summaryElement?.focus();
}

export function useErrorSummaryFocus<TValues extends FieldValues>(
  errors: FieldErrors<TValues>,
  submitCount: number,
) {
  const summaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0) {
      focusFirstInvalidField(errors, summaryRef.current);
    }
  }, [errors, submitCount]);

  return summaryRef;
}

export function useBeforeUnloadPrompt(shouldBlock: boolean): void {
  useEffect(() => {
    if (!shouldBlock) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = unsavedChangesMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldBlock]);
}

export function UnsavedChangesPrompt({ when }: { readonly when: boolean }): ReactNode {
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);

  if (!when || dataRouterContext === null) {
    return null;
  }

  return <DataRouterUnsavedChangesPrompt />;
}

function DataRouterUnsavedChangesPrompt(): ReactNode {
  const blocker = useBlocker(true);

  return (
    <ConfirmActionModal
      confirmLabel="Paraseste pagina"
      description={unsavedChangesMessage}
      isOpen={blocker.state === "blocked"}
      onCancel={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
      title="Modificari nesalvate"
      variant="danger"
    />
  );
}

export function useCloseGuard(
  isDirty: boolean,
  isSubmitting: boolean,
  onOpenChange: (isOpen: boolean) => void,
) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return {
    confirmModal: (
      <ConfirmActionModal
        confirmLabel="Inchide fara salvare"
        description={unsavedChangesMessage}
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          onOpenChange(false);
        }}
        title="Modificari nesalvate"
      />
    ),
    handleOpenChange: (nextIsOpen: boolean) => {
      if (!nextIsOpen && isDirty && !isSubmitting) {
        setIsConfirmOpen(true);
        return;
      }

      onOpenChange(nextIsOpen);
    },
  };
}
