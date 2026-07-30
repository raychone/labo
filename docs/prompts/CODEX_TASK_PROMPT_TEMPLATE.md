# Codex Task Prompt Template

Implement `{{TASK_ID}}`.

Before coding:

1. Read `docs/AI_CONTEXT.md`.
2. Read `docs/MASTER_PLAN.md`.
3. Read `docs/tasks/{{TASK_ID}}.md`.
4. Read every document listed under `Read first`.
5. Verify Git preconditions from `docs/GIT_WORKFLOW.md`.

Implement only the task scope.

Do not:

- start the next task;
- perform unrelated cleanup;
- modify assets;
- weaken tests or security;
- silently decide unresolved business questions.

During implementation:

- mark the task `IN PROGRESS`;
- follow existing architecture;
- add task-specific tests;
- use non-destructive migrations;
- update relevant documentation.

At completion:

- run checks from `docs/TESTING.md`;
- verify acceptance criteria;
- update `docs/MASTER_PLAN.md`, `docs/AI_CONTEXT.md`, and the task document;
- create the required commit;
- verify the tracked tree is clean;
- report changes, tests, risks, commit, and next task;
- stop.

Extra instructions:

`{{EXTRA_INSTRUCTIONS}}`
