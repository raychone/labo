# UI Guidelines

## Principles

- Mobile-first, responsive for tablet and desktop.
- Romanian labels and clear operational wording.
- Use the existing UI kit in `packages/ui`.
- Prefer consistent controls over browser-default generic controls.
- Keep pages dense enough for operational use, but readable for non-technical users.
- Do not duplicate pages for the same workflow.

## Components And States

- Use reusable buttons, cards, fields, selector/radio controls, textareas, modals, drawers, tables, badges, and toasts.
- Provide loading, empty, error, disabled, readonly, and success states.
- Use drawers for detail/edit flows where the user should keep list context.
- Use modals for focused actions and confirmations.
- Tables need mobile alternatives or responsive layouts.
- Status badges should be consistent and avoid exposing financial meaning to unauthorized users.

## Forms

- React Hook Form and Zod for complex forms.
- Show inline validation and server errors.
- Disable invalid or in-flight actions.
- Reset dependent fields when parent selections change.
- Do not place business rules only in frontend form logic.

## Accessibility

- Keep keyboard-accessible controls.
- Use clear labels and aria labels for icon-only actions.
- Avoid text overlap and unstable layout shifts.
- Preserve readable contrast.
