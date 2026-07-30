# Codex Review Prompt Template

Review `{{TASK_ID}}` without modifying files.

Read:

- `docs/AI_CONTEXT.md`;
- `docs/MASTER_PLAN.md`;
- `docs/tasks/{{TASK_ID}}.md`;
- every document listed under `Read first`;
- the target commit or diff.

Review for:

- acceptance criteria gaps;
- behavior regressions;
- security/RBAC issues;
- data model or migration risks;
- missing tests;
- documentation drift;
- accidental files or secrets.

Classify findings as blocking or non-blocking. Do not edit files unless explicitly requested.

Extra instructions:

`{{EXTRA_INSTRUCTIONS}}`
