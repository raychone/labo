import { FormActions, FormLayout, TextInput } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { useState } from "react";

export function ManualScanForm({
  isLoading,
  onSubmit,
}: {
  readonly isLoading: boolean;
  readonly onSubmit: (payload: string) => void;
}): ReactNode {
  const [payload, setPayload] = useState("");

  return (
    <FormLayout
      className="work-scan-page__manual"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isLoading && payload.trim().length > 0) {
          onSubmit(payload);
        }
      }}
    >
      <TextInput
        disabled={isLoading}
        id="qrPayload"
        label="Cod scanat sau cod lucrare"
        onChange={(event) => setPayload(event.target.value)}
        placeholder="WO-2026-000001 sau dl-work:..."
        required
        value={payload}
      />
      <FormActions isSubmitting={isLoading} submitDisabled={payload.trim().length === 0} submitLabel="Caută lucrarea" />
    </FormLayout>
  );
}
