# Git Workflow

## Preflight

Before changes:

```bash
git branch --show-current
git status --short
git log -10 --oneline
git ls-files --others --exclude-standard
```

Work on `main` unless the user explicitly approves another branch. The tracked working tree must be clean unless the user has intentionally left related changes.

## Scope

- Modify only files required by the approved task.
- Do not perform unrelated cleanup.
- Do not start the next task.
- Do not use destructive Git commands.
- Do not delete untracked files.
- Do not add or modify `assets/` unless a task explicitly approves it. Treat untracked `assets/` files as intentional user resources.

## Prisma Migrations

- Applied migration files are immutable.
- If an applied migration needs compatibility SQL or a correction, add a new forward-only migration.
- Do not amend, reorder, rename, or edit an already-applied migration file.
- Do not reset or recreate a populated development database to hide migration-history drift.

## Commit

One completed task equals one logical commit.

Format:

```text
<TASK-ID>: <imperative summary>
```

Before commit:

- inspect the full diff;
- run required checks;
- run `git diff --check`;
- confirm no accidental files;
- confirm no secrets;
- confirm the tracked tree contains only the task changes.

After commit, verify `git status --short` is clean and report the commit hash.
