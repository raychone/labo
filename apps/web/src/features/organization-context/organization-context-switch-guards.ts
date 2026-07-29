import type { LegalEntityOption } from "@dental-lab/shared";

export type OrganizationContextSwitchGuard = (input: {
  readonly current: LegalEntityOption | null;
  readonly next: LegalEntityOption;
}) => string | null;

const guards = new Set<OrganizationContextSwitchGuard>();

export function registerOrganizationContextSwitchGuard(guard: OrganizationContextSwitchGuard): () => void {
  guards.add(guard);

  return () => {
    guards.delete(guard);
  };
}

export function getOrganizationContextSwitchBlockMessage(input: {
  readonly current: LegalEntityOption | null;
  readonly next: LegalEntityOption;
}): string | null {
  for (const guard of guards) {
    const message = guard(input);

    if (message) {
      return message;
    }
  }

  return null;
}
