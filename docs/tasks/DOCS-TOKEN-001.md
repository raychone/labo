# DOCS-TOKEN-001 - Token-efficient permanent specification system

## Status

COMPLETED.

## Objective

Create canonical documentation sources so future Codex tasks can use short prompts without repeating architecture, permanent rules, security requirements, testing commands, and module specifications.

## Dependencies

TECH-CLAIM-001B completed and committed.

## Read first

- [../AI_CONTEXT.md](../AI_CONTEXT.md)
- [../MASTER_PLAN.md](../MASTER_PLAN.md)
- [../DOCUMENTATION_POLICY.md](../DOCUMENTATION_POLICY.md)
- [../GIT_WORKFLOW.md](../GIT_WORKFLOW.md)

## Scope

Documentation-only analysis and consolidation. Create `docs/`, module documents, task documents, prompt templates, and root references.

## Out of scope

No business logic, API behavior, frontend behavior, Prisma schema, migrations, seed, permissions, dependencies, runtime config, or functional task implementation.

## Business decisions

No new business decisions. Unknown future rules are marked as TBD/open decisions.

## Data model changes

None.

## API changes

None.

## UI changes

None.

## Security and RBAC

No runtime security changes. Documentation records current security rules.

## Audit

No runtime audit changes.

## Task-specific tests

Validate documentation links and run standard regression checks from [../TESTING.md](../TESTING.md). Do not run migrations.

## Acceptance criteria

- `docs/` contains canonical context, plan, rules, architecture, domain, module docs, task docs, and prompt templates.
- Root docs link to canonical current docs.
- `TECH-CLAIM-001B` is confirmed as completed.
- `TECH-CLAIM-001C` remains not started.
- No functional code changes.

## Completion

- Completed: 2026-07-30T10:54:47Z.
- Link validation: passed for docs and updated root Markdown files.
- Technical verification: standard regression commands from [../TESTING.md](../TESTING.md).

## Documentation updates

Update this file, [../MASTER_PLAN.md](../MASTER_PLAN.md), [../AI_CONTEXT.md](../AI_CONTEXT.md), and root documentation headers.

## Commit

`DOCS-TOKEN-001: create permanent Codex documentation system`

## Next task

TECH-CLAIM-001C, awaiting approval.
