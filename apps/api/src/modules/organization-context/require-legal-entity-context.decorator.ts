import { SetMetadata } from "@nestjs/common";

import { LEGAL_ENTITY_CONTEXT_METADATA_KEY } from "./organization-context.constants.js";

export function RequireLegalEntityContext(): ReturnType<typeof SetMetadata> {
  return SetMetadata(LEGAL_ENTITY_CONTEXT_METADATA_KEY, true);
}
