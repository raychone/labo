# Documentation Policy

## Precedence

For implemented reality:

1. code;
2. migrations;
3. tests;
4. seed;
5. recent coherent documentation.

For planning/status:

1. [MASTER_PLAN.md](MASTER_PLAN.md);
2. task documents under [tasks/](tasks/README.md);
3. module documents under [modules/](modules/README.md);
4. historical root documents.

Historical documents do not override canonical documents.

## What Task Documents Must Not Copy

Task documents should not copy:

- all permanent rules;
- the full architecture;
- all security rules;
- standard verification commands;
- complete module documentation.

They should link to the relevant canonical docs and define only the task-specific scope, decisions, acceptance criteria, and required verification additions.

## Required Updates

When implementation changes architecture or module behavior:

- update the relevant module document;
- update [ARCHITECTURE.md](ARCHITECTURE.md) or [DOMAIN_MODEL.md](DOMAIN_MODEL.md) when boundaries/model change;
- update [MASTER_PLAN.md](MASTER_PLAN.md);
- update [AI_CONTEXT.md](AI_CONTEXT.md) only when the compact working context changes materially.
