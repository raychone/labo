# Workflow

## Status

Templates and execution are implemented. Advanced lifecycle/KPI behavior is planned.

## Purpose

Define ordered technical stages and track runtime execution for work orders.

## Roles And Permissions

`workflow.read`, `workflow.configure`, `workflow.create`, `workflow.update`, `workflow.archive`, `workflow.assign_stage`, `workflow.start_stage`, `workflow.pause_stage`, `workflow.complete_stage`, `workflow.reassign_stage`, `workflow.reopen_stage`.

## Domain Concepts

Template, ordered stages, optional stage, runtime execution, stage assignment, start, complete, timeline event.

## Business Rules

Only confirmed behavior should be used: templates have ordered stages and runtime work execution supports stage start/complete and assignment. Pause/resume/skip/reopen are permission concepts and future/partial behavior unless confirmed by task code.

## Data Model

`WorkflowTemplate`, `WorkflowStageDefinition`, `WorkWorkflowExecution`, `WorkStageExecution`, `WorkStageEvent`.

## API

Template endpoints under work types and `/workflow-templates/:id`. Runtime endpoints under `/works/:workId/workflow`.

## UI

`/work-types/:workTypeId/workflow`, workflow section in work detail, technician workbench integration.

## Audit

Template changes and stage events.

## Security

Stage actions require backend RBAC and ownership checks where implemented.

## Edge Cases

Archived template, existing runtime from older template, stage already started/completed, assignment conflicts.

## Implemented Tasks

WORKFLOW-001, WORKFLOW-002, TECH-001.

## Planned Tasks

TECH-CLAIM-001C and future KPI/reporting.

## Deferred

Full pause/resume/skip semantics unless explicitly implemented.

## Open Decisions

Final KPI and exception handling rules.

## Related Documents

[technician-execution.md](technician-execution.md), [claim.md](claim.md), [works.md](works.md).
