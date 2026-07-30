# Codex Bugfix Prompt Template

Fix bug: `{{BUG_SUMMARY}}`.

Before changing code:

1. Read `docs/AI_CONTEXT.md`.
2. Read the relevant module document under `docs/modules/`.
3. Read `docs/TESTING.md` and `docs/GIT_WORKFLOW.md`.
4. Reproduce the bug or explain why reproduction is not possible.

Work rules:

- determine root cause;
- keep scope minimal;
- add or update a regression test;
- do not add feature work;
- do not start roadmap tasks;
- do not modify assets unless explicitly approved.

At completion:

- run standard verification from `docs/TESTING.md`;
- update documentation if behavior or architecture changed;
- create one bugfix commit;
- report reproduction, root cause, fix, tests, risks, and commit.

Extra instructions:

`{{EXTRA_INSTRUCTIONS}}`
