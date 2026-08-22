# Workflow

## Status

Templates and execution are implemented. Runtime execution is cycle-scoped. Advanced lifecycle/KPI behavior is planned.

## Purpose

Define ordered technical stages and track runtime execution for work orders.

## Roles And Permissions

`workflow.read`, `workflow.configure`, `workflow.create`, `workflow.update`, `workflow.archive`, `workflow.assign_stage`, `workflow.start_stage`, `workflow.pause_stage`, `workflow.complete_stage`, `workflow.reassign_stage`, `workflow.reopen_stage`.

## Domain Concepts

Template, ordered stages, optional stage, cycle-scoped runtime execution, stage assignment, start, complete, timeline event.

## Business Rules

Only confirmed behavior should be used: templates have ordered stages and runtime work execution supports stage start/complete and assignment on the active work cycle. Persisted `WorkOrder.status` is the final operational state (`RECEPTIE`, `IN_LUCRU`, `IN_ASTEPTARE`, `FINALIZATA`) and remains separate from workflow stage execution state. When a new runtime workflow is created from an eligible creator, the initial stage is auto-assigned to that creator so ownership-based start/complete permissions can be exercised without introducing a parallel lifecycle. Registering a returned work opens a new active cycle with a new runtime workflow execution; previous cycle workflow executions remain historical. Pause/resume/skip/reopen are permission concepts and future/partial behavior unless confirmed by task code.

## Data Model

`WorkflowTemplate`, `WorkflowStageDefinition`, `WorkCycle`, `WorkWorkflowExecution`, `WorkStageExecution`, `WorkStageEvent`.

## API

Template endpoints under work types and `/workflow-templates/:id`. Runtime endpoints under `/works/:workId/workflow`. STATUS-001A also reads current stage and progress through `GET /status/operational`.

## UI

`/work-types/:workTypeId/workflow`, workflow section in work detail, technician workbench integration, and reception-to-technician handoff after the initial eligible stage is completed. Work detail drawers surface the current runtime execution summary before the historical workflow sections so technicians and managers can see the active stage context without scrolling.

## Audit

Template changes and stage events.

## Security

Stage actions require backend RBAC and ownership checks where implemented.

## Edge Cases

Archived template, existing runtime from older template, stage already started/completed, assignment conflicts.

## Implemented Tasks

WORKFLOW-001, WORKFLOW-002, TECH-001, STATUS-001A read-model integration, WORK-CYCLES-001A, WORK-CYCLES-001B, TECH-EXECUTION-001, STATE-001A.

## Planned Tasks

TECH-CLAIM-001C and future KPI/reporting.

## Deferred

Full pause/resume/skip semantics unless explicitly implemented.

## Open Decisions

Final KPI and exception handling rules.

## Related Documents

[technician-execution.md](technician-execution.md), [claim.md](claim.md), [works.md](works.md).
