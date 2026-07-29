export const ORGANIZATION_CONTEXT_AUDIT_ACTIONS = {
  switched: "organization_context.switched",
} as const;

export const ORGANIZATION_CONTEXT_RESOURCE_TYPES = {
  legalEntityContext: "legal_entity_context",
  session: "session",
} as const;

export const LEGAL_ENTITY_CONTEXT_METADATA_KEY = Symbol("legal_entity_context_required");
