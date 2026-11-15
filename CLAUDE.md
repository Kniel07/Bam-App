# CLAUDE.md — Project Memory: Our Little Universe

Read this first in every session. It is the source of truth for project
state; do not rely on conversation history.

## Current status

- **Phase:** 2 — DESIGN. THINK approved. DESIGN deliverables drafted, **awaiting owner approval**.
- **Next:** owner approves DESIGN (incl. ERD/RLS) → Phase 3 BUILD, slice S0 (see ARCHITECTURE §9).
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
- Sign-in (approved, TD-008): partner scans a **QR key** and is signed in automatically, with no login screen. The key lives in the URL fragment and is removed after sign-in; it is never committed or logged. Owner uses email + password on a separate route. Key rotation = revoke + reprint.
- Address (approved, TD-017): free `<project>.vercel.app`; project name non-identifying and frozen before the QR is printed.
- Partner device: **Android** (Chrome assumed; also test Samsung Internet if Samsung). Test priority 1 = Android Chrome.

## Stack (approved, THINK)

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
| Architecture (folders, auth, ops, security, build order) | `docs/architecture/ARCHITECTURE.md` |
| Database (ERD, RLS, RPC, storage) | `docs/database/DATABASE-DESIGN.md` |
| Design system | `docs/design/DESIGN-SYSTEM.md` |
| Page structure & wireframes | `docs/design/PAGE-STRUCTURE.md` |
| User flows | `docs/design/USER-FLOWS.md` |
| Components | `docs/design/COMPONENT-SPECIFICATION.md` |
| Responsive | `docs/design/RESPONSIVE-DESIGN.md` |

## Decisions

- Approved (THINK): D1–D7 (stack, owner editing in R1, envelope/content split, single relationship + 2 roles, keep-alive + backups before launch, month-end rule, unlock at anchor minute), TD-008, TD-016, TD-017.
- Awaiting approval (DESIGN): visual direction (DS-01…06), TD-018 synthetic partner login, TD-019 content only via `open_letter()`, TD-020 GitHub Actions ops, design additions A1–A3 (see below).

## Design additions beyond approved requirements (need explicit approval)

- A1 First-visit welcome envelope + `welcome_message` setting.
- A2 Story "anchor marker" derived from settings (timeline never empty).
- A3 Two-tap letter opening (tap envelope, then tap seal).

## Open questions

See `docs/product/PRD.md` §9 (Q3–Q11).

## Completed

- THINK deliverables approved.
- DESIGN deliverables drafted.

## Known issues

- None (no code yet).
