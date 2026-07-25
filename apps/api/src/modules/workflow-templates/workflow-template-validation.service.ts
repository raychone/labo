import { BadRequestException, Injectable } from "@nestjs/common";

import type { WorkflowStageDefinitionDto } from "./dto/workflow-templates.dto.js";
import {
  MAX_WORKFLOW_STAGE_DURATION_MINUTES,
  MAX_WORKFLOW_STAGES,
  RESERVED_WORKFLOW_STAGE_KEYS,
  WORKFLOW_STAGE_KEY_PATTERN,
  WORKFLOW_STAGE_ROLE_CODES,
} from "./workflow-templates.constants.js";

export interface NormalizedWorkflowStage {
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly estimatedDurationMinutes: number | null;
  readonly allowedRoleCodes: readonly (typeof WORKFLOW_STAGE_ROLE_CODES)[number][];
  readonly isInitial: boolean;
  readonly isFinal: boolean;
}

function hasUnsafeText(value: string): boolean {
  return /[<>]/.test(value) || value.toLowerCase().includes("script");
}

function assertPlainText(value: string | null, fieldName: string): void {
  if (value !== null && hasUnsafeText(value)) {
    throw new BadRequestException(`${fieldName} must not contain HTML or script text.`);
  }
}

@Injectable()
export class WorkflowTemplateValidationService {
  public normalizeStages(stages: readonly WorkflowStageDefinitionDto[]): readonly NormalizedWorkflowStage[] {
    if (stages.length > MAX_WORKFLOW_STAGES) {
      throw new BadRequestException(`A workflow can contain at most ${MAX_WORKFLOW_STAGES} stages.`);
    }

    const keys = new Set<string>();
    const normalized = stages
      .map((stage, index) => ({ index, stage }))
      .sort((left, right) => left.stage.sortOrder - right.stage.sortOrder || left.index - right.index)
      .map(({ stage }, index, orderedStages) => {
        this.validateStageKey(stage.key);

        if (keys.has(stage.key)) {
          throw new BadRequestException(`Duplicate stage key: ${stage.key}.`);
        }
        keys.add(stage.key);

        assertPlainText(stage.name, "name");
        assertPlainText(stage.description ?? null, "description");
        this.validateDuration(stage.estimatedDurationMinutes ?? null);
        this.validateRoles(stage.allowedRoleCodes);

        return {
          allowedRoleCodes: [...stage.allowedRoleCodes],
          description: stage.description ?? null,
          estimatedDurationMinutes: stage.estimatedDurationMinutes ?? null,
          isFinal: index === orderedStages.length - 1,
          isInitial: index === 0,
          key: stage.key,
          name: stage.name,
          sortOrder: index + 1,
        };
      });

    this.validateInitialFinal(normalized);

    return normalized;
  }

  public ensureTemplateCanActivate(stages: readonly NormalizedWorkflowStage[] | readonly { readonly isInitial: boolean; readonly isFinal: boolean; readonly sortOrder: number; readonly key: string; readonly allowedRoleCodes: unknown; readonly estimatedDurationMinutes: number | null }[]): void {
    if (stages.length < 2) {
      throw new BadRequestException("Workflow must contain at least two stages before activation.");
    }

    this.validateInitialFinal(stages);
  }

  public validateStageKey(key: string): void {
    if (!WORKFLOW_STAGE_KEY_PATTERN.test(key) || RESERVED_WORKFLOW_STAGE_KEYS.has(key) || hasUnsafeText(key)) {
      throw new BadRequestException(`Invalid stage key: ${key}.`);
    }
  }

  private validateDuration(value: number | null): void {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > MAX_WORKFLOW_STAGE_DURATION_MINUTES)) {
      throw new BadRequestException(`Estimated duration must be between 1 and ${MAX_WORKFLOW_STAGE_DURATION_MINUTES} minutes.`);
    }
  }

  private validateRoles(roleCodes: readonly string[]): void {
    const seen = new Set<string>();
    for (const roleCode of roleCodes) {
      if (!WORKFLOW_STAGE_ROLE_CODES.includes(roleCode as never)) {
        throw new BadRequestException(`Invalid role code: ${roleCode}.`);
      }

      if (seen.has(roleCode)) {
        throw new BadRequestException(`Duplicate role code: ${roleCode}.`);
      }
      seen.add(roleCode);
    }

    if (roleCodes.length === 0) {
      throw new BadRequestException("At least one allowed role is required.");
    }
  }

  private validateInitialFinal(stages: readonly { readonly isInitial: boolean; readonly isFinal: boolean }[]): void {
    const initialCount = stages.filter((stage) => stage.isInitial).length;
    const finalCount = stages.filter((stage) => stage.isFinal).length;

    if (initialCount !== 1) {
      throw new BadRequestException("Workflow must have exactly one initial stage.");
    }

    if (finalCount !== 1) {
      throw new BadRequestException("Workflow must have exactly one final stage.");
    }

    if (stages.length > 0 && !stages[0]?.isInitial) {
      throw new BadRequestException("The initial stage must be first.");
    }

    if (stages.length > 0 && !stages.at(-1)?.isFinal) {
      throw new BadRequestException("The final stage must be last.");
    }
  }
}
