# Documentation

This directory is the canonical, token-efficient documentation system for future Codex work.

Root documents such as `README.md`, `MVP-IMPLEMENTATION-PLAN.md`, `IMPLEMENTATION_STATUS.md`, `REAL-LAB-WORKFLOW.md`, `DEMO.md`, `DEMO-SCRIPT.md`, and `PRICING-ASSET-AUDIT.md` are preserved for history, demo flow, or extended reference. They must not override the canonical documents in `docs/`.

## Reading Order

1. [AI_CONTEXT.md](AI_CONTEXT.md) for a compact project brief.
2. [MASTER_PLAN.md](MASTER_PLAN.md) for current task order and status.
3. [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md) for permanent rules.
4. The task file under [tasks/](tasks/README.md).
5. The module documents listed under `Read first` in the task file.

## Source Of Truth

| Need | Canonical document |
|---|---|
| context rapid pentru Codex | [AI_CONTEXT.md](AI_CONTEXT.md) |
| roadmap si status | [MASTER_PLAN.md](MASTER_PLAN.md) |
| reguli permanente | [IMPLEMENTATION_RULES.md](IMPLEMENTATION_RULES.md) |
| arhitectura | [ARCHITECTURE.md](ARCHITECTURE.md) |
| model de domeniu | [DOMAIN_MODEL.md](DOMAIN_MODEL.md) |
| securitate | [SECURITY.md](SECURITY.md) |
| testare | [TESTING.md](TESTING.md) |
| UI | [UI_GUIDELINES.md](UI_GUIDELINES.md) |
| Git | [GIT_WORKFLOW.md](GIT_WORKFLOW.md) |
| reguli de modul | [modules/](modules/README.md) |
| scope de task | [tasks/](tasks/README.md) |

## Minimal Reading Sets

Normal implementation task:

- [AI_CONTEXT.md](AI_CONTEXT.md)
- [MASTER_PLAN.md](MASTER_PLAN.md)
- `docs/tasks/<TASK_ID>.md`
- every file listed in the task document under `Read first`

Bugfix:

- [AI_CONTEXT.md](AI_CONTEXT.md)
- relevant module document
- [TESTING.md](TESTING.md)
- [GIT_WORKFLOW.md](GIT_WORKFLOW.md)
- [prompts/CODEX_BUGFIX_PROMPT_TEMPLATE.md](prompts/CODEX_BUGFIX_PROMPT_TEMPLATE.md)

Review:

- relevant task document
- target commit or diff
- [prompts/CODEX_REVIEW_PROMPT_TEMPLATE.md](prompts/CODEX_REVIEW_PROMPT_TEMPLATE.md)
- [TESTING.md](TESTING.md)

## Normative Versus Historical

Normative documents define current rules and must be kept synchronized with implementation. Historical documents can retain past plans, rationale, or demo scripts, but should link back here when they mention status.

Use [DOCUMENTATION_POLICY.md](DOCUMENTATION_POLICY.md) for precedence rules. In short: implementation reality is confirmed by code, migrations, tests, and seed; task status is tracked in [MASTER_PLAN.md](MASTER_PLAN.md).

## Updating Documentation

After every task:

- update [MASTER_PLAN.md](MASTER_PLAN.md);
- update [AI_CONTEXT.md](AI_CONTEXT.md) when the important current context changed;
- update the relevant module document;
- update the task document;
- update root/demo documents only when they remain user-facing or historically useful.

Avoid duplication. Link to permanent rules instead of copying them into each task.
