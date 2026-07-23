import { Button, TextInput } from "@dental-lab/ui";
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
    <form
      className="work-scan-page__manual"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(payload);
      }}
    >
      <TextInput
        label="Cod lucrare sau payload QR"
        onChange={(event) => setPayload(event.target.value)}
        placeholder="WO-2026-000001 sau dl-work:..."
        value={payload}
      />
      <Button disabled={payload.trim().length === 0 || isLoading} isLoading={isLoading} type="submit">
        Cauta
      </Button>
    </form>
  );
}
