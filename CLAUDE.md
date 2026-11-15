# CLAUDE.md — Project Memory: Our Little Universe

Read this first in every session. It is the source of truth for project
state; do not rely on conversation history.

## Current status

- **Phase:** 1 — THINK. Deliverables drafted, **awaiting owner approval**.
- **Next:** owner review + independent review → approve → Phase 2 DESIGN.
- **Do not** write application code, install packages, or scaffold the app until DESIGN is approved.

## Workflow (Kniel Framework)

THINK → DESIGN → BUILD → VALIDATE → DOCUMENT → PRESERVE. No phase starts
without explicit owner approval of the previous one. Ask one essential
clarification at a time.

## Hard rules

1. **Public repository** (owner will make it private after deployment; the rule stays
   permanent because public history can't be recalled). Never commit personal data: relationship date/time,
   timezone, names, messages, photos, real seed data. Refer to config keys
   (`relationship.start_at`, `relationship.timezone`). Never commit secrets; `.env*` is gitignored.
2. Never invent personal content. Use placeholders like `[PARTNER_NAME]`.
3. Authorization lives in the database (RLS), never only in the client.
4. Locked/draft content must never reach the partner's browser.
5. Never silently change an approved decision. Log changes in
   `docs/architecture/TECHNICAL-DECISIONS.md` § Change log.
6. Never claim something is tested unless it was.

## Known facts (non-personal)

- Two users: `owner`, `partner`. Exactly two, ever.
- Anchor moment and timezone: **provided by owner, stored privately** (not in git). It is shortly after midnight, so the default unlock = the anchor minute (TD-011).
- Launch = the first monthsary, at the anchor minute (fixed date, flexible scope).
- Partner permissions (approved): memories only. Create, and edit/delete her own. Read-only everywhere else (plus letter read status via `open_letter()`).
- Partner device: TBD (assume iPhone Safari).

## Stack (proposed, pending approval)

React + Vite + TypeScript (strict) · Tailwind · Supabase (Postgres, Auth,
Storage, RLS) · Vercel Hobby · date-fns v4 + @date-fns/tz · Motion (scoped) ·
React Router · TanStack Query · Lucide · Vitest · Playwright.

## Naming conventions

- Components: `PascalCase.tsx` (`MonthsaryCounter.tsx`)
- Functions/variables: `camelCase` (`getNextMonthsary()`)
- DB tables/columns: `snake_case` (`letter_contents.unlock_at`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_IMAGE_SIZE`)

## Documents

| Doc | Path |
|---|---|
| PRD | `docs/product/PRD.md` |
| Requirements | `docs/product/REQUIREMENTS.md` |
| MVP scope | `docs/product/MVP-SCOPE.md` |
| Technical decisions | `docs/architecture/TECHNICAL-DECISIONS.md` |
| Risk register | `docs/architecture/RISK-REGISTER.md` |

## Decisions awaiting approval

D1 stack (TD-001…006, TD-014) · D2 owner editing in R1 · D3 no unlock-rules
table + envelope/content split (TD-007, TD-009) · D4 single relationship +
two roles · D5 keep-alive + backups before launch (TD-012, TD-013) ·
D6 month-end rule DR-01 · D7 default unlock = anchor minute (TD-011).

## Open questions

See `docs/product/PRD.md` §9 (Q3–Q11).

## Completed

- THINK deliverables drafted.

## Known issues

- None (no code yet).
