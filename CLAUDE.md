# CLAUDE.md — Project Memory: Our Little Universe

Read this first in every session. It is the source of truth for project
state; do not rely on conversation history.

## Current status

- **Phase:** 3 — BUILD. THINK and DESIGN approved.
- **Slices done:** S0 scaffold · S1a migrations + RLS tests · S1b auth · S2 dates, counter, Home, welcome, settings · S3 Our Story · S4 Letters.
- **Owner must apply in Supabase SQL editor:** `0008_partner_letters.sql`, then `0009_shared_story.sql`.
- **Proposed, awaiting approval:** CR-04 phone notifications (`docs/design/CR-04-NOTIFICATIONS.md`).
- **Next:** S5 Memories (+ featured photos on Home, CR-03) → S6 Ops → (S7 Reasons stretch). See ARCHITECTURE §9.
- **Dev environment live:** Vercel (production URL points at the dev Supabase project), migrations applied, owner + partner provisioned, QR sign-in verified by owner. Prod project setup at L-7 (SETUP-GUIDE Part E).

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
- Permissions (approved, TD-021/TD-022): **shared authorship everywhere**: both add to every content section; each edits/deletes own; drafts private to author; owner may also remove anything he can see. Letters: recipient opens when unlocked; owner cannot read hers early. Settings, key, anchor: owner-only.
- Featured photos on Home (TD-023, CR-03): delivered with S5 Memories.
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
| Setup guide (accounts, Supabase, Vercel, provisioning) | `docs/deployment/SETUP-GUIDE.md` |
| CR-04 notifications proposal | `docs/design/CR-04-NOTIFICATIONS.md` |

## Decisions

- Approved (THINK): D1–D7 (stack, owner editing in R1, envelope/content split, single relationship + 2 roles, keep-alive + backups before launch, month-end rule, unlock at anchor minute), TD-008, TD-016, TD-017.
- Approved (DESIGN): visual direction DS-01…06, TD-018, TD-019, TD-020, additions A1–A3.

## Design additions (approved)

- A1 First-visit welcome envelope + `welcome_message` setting.
- A2 Story "anchor marker" derived from settings (timeline never empty).
- A3 Two-tap letter opening (tap envelope, then tap seal).

## Open questions

See `docs/product/PRD.md` §9 (Q3–Q11).

## Completed

- THINK and DESIGN approved.
- S0: Vite + React 19 + TS 5.9 strict + Tailwind 4 tokens, ESLint, Vitest, CI (app + database jobs), Vercel headers (CSP, noindex).
- S1a: migrations 0001–0007 (+0008 CR-01, 0009 CR-02); `npm run test:db` → 122 assertions on local Postgres 16 (S1–S14 + constraints + storage + time unlock); negative control verified.
- S1b: QR key landing (fragment stripped before network, tested), owner sign-in, locked screen, guards, `npm run partner-key -- create|rotate`.
- S2: `lib/dates/monthsary.ts` (27 tests, device-TZ independent), counter, next monthsary, monthsary-day celebration, welcome envelope (A1), settings.
- S3: shared media lib (client compression → WebP, EXIF stripped; upload; cached signed URLs), Polaroid, PhotoPicker; Our Story timeline with the anchor placed chronologically, owner CRUD with drafts/highlight/photo; Home corner card. Feature routes lazy-loaded.
- S4: Letters grid (sealed/new/locked/opened/draft), two-tap ceremony (Motion, lazy, reduced-motion fade), reading view via `open_letter()` only, owner editor (anytime / on a date, default = next monthsary minute), Home "Waiting for you", Letters corner card, unread dot in nav.

## How to verify

`npm run typecheck && npm run lint && npm test && npm run test:db && npm run build`

## Known issues

- KI-01 Dev-only: `minimatch` moderate advisory via typescript-eslint (lint tooling, not shipped).
- KI-02 `database.types.ts` is hand-written; regenerate from the real project and diff.
- KI-03 Playwright's fake clock breaks `@date-fns/tz` (Date subclass). Test-harness only; visual tests must use data-relative dates instead of a fake clock.
- KI-04 Main bundle ~117 KB gzip after route splitting (budget 180 KB). Keep feature routes lazy; Motion lazy-loaded (S4).
- KI-05 Android back button closing sheets: planned for S6 polish.
- KI-06 Desktop Home is single-column until Letters/Memories corners exist (S4–S5).
- KI-08 Supabase SQL editor warns on 0002/0003 (tables created before 0005 enables RLS); owner chooses "Run and enable RLS". Future migrations: enable RLS in the same file that creates a table.
- KI-09 Vitest: `vi.fn().mockRejectedValue` is reported as unhandled even when caught; tests use plain functions for rejecting async mocks.
- KI-10 When the owner removes her *unopened* letter, its photo path is sealed from him, so the photo file is orphaned (covered by the planned R2 cleanup).
- KI-07 Orphaned storage files possible if a delete of the file fails after the row is deleted (logged warning); cleanup query planned for R2.
