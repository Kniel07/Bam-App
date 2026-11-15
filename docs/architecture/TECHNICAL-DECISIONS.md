# Technical Decisions — Our Little Universe

| Field | Value |
|---|---|
| Status | **DRAFT — decisions marked *Proposed* await owner approval** |
| Version | 0.1 |

Format per decision: context → decision → alternatives → trade-offs →
status. Changes to an approved decision must record: previous decision,
proposed decision, reason, impact, approval status (see §Change log).

---

## Verified free-tier limits (checked during THINK, Nov 2026)

| Service | Limit relevant to us | Source |
|---|---|---|
| Supabase Free | 500 MB database · 1 GB file storage · 5 GB egress (+5 GB cached) · 50,000 MAU · **projects pause after 1 week of inactivity** · 2 active projects | supabase.com/pricing |
| Supabase Free | No downloadable automated backups assumed. **Re-confirm in DESIGN.** | — |
| Vercel Hobby | Personal, **non-commercial** use only (this project qualifies). Bandwidth commonly cited ~100 GB/month (third-party figure, **re-confirm on official limits page**). Exceeding limits pauses the feature up to 30 days. | vercel.com/docs (fair use) |

**Capacity estimate.** At ≤ 500 KB per compressed photo, 1 GB storage holds
~1,800 photos. Two users viewing a gallery stays far below 5 GB egress if
signed URLs are cached (TD-010). Database text content is negligible.
**Projected cost: $0.** The upgrade path, if storage ever fills, is Supabase
Pro ($25/mo). It is **not** approved and would need explicit owner approval.

---

## TD-001 Frontend: React + Vite + TypeScript (strict) — *Proposed*

- **Why:** static SPA, no server needed, fast dev loop, large ecosystem.
- **Alternatives:** Next.js (SSR unnecessary; adds server runtime concepts); Astro (less suited to app-like interactivity).
- **Trade-off:** SPA has no SEO, which we explicitly don't want anyway.

## TD-002 Styling: Tailwind CSS — *Proposed*

- **Why:** design tokens live in one config; consistent spacing/colour; small CSS output.
- **Alternative:** CSS Modules (more files, tokens duplicated by hand).

## TD-003 Backend: Supabase (Postgres, Auth, Storage, RLS) — *Proposed*

- **Why:** the only free option giving **database-enforced authorization** without running a server. Locking letters by `now()` in a policy is exactly what we need.
- **Alternatives:** Firebase (security rules workable but NoSQL; weaker relational modelling); custom Spring Boot API (needs an always-on host, so not free; more to maintain).
- **Trade-off:** free-tier pause and no backups → mitigated by TD-012, TD-013.

## TD-004 Hosting: Vercel Hobby — *Proposed*

- **Why:** free for personal non-commercial use, Git-based deploys, custom headers (`X-Robots-Tag`).
- **Alternatives:** Netlify / Cloudflare Pages (equivalent; either is a fine fallback).

## TD-005 Dates: date-fns v4 + `@date-fns/tz` — *Proposed*

- **Why:** month-end and timezone maths is error-prone; tree-shakeable, well tested.
- **Alternatives:** native `Temporal` (cleanest API, but Safari support must be confirmed and the partner likely uses iPhone); Luxon (heavier); hand-written (rejected: risk).
- All monthsary logic lives in one pure module (`lib/dates`) with exhaustive unit tests (DR-01…05).

## TD-006 Animation: Motion (formerly Framer Motion), scoped — *Proposed*

- **Why:** the envelope opening and reveals need orchestrated, interruptible animation.
- **Constraint:** lazy-loaded only on screens that use it; ambient effects (floating hearts) in CSS; `prefers-reduced-motion` honoured.
- **Alternative:** CSS-only (lighter, but complex sequences become brittle).

## TD-007 Data model shape — *Proposed* (full ERD presented in DESIGN)

1. **Single relationship row** + `relationship_members (user_id, role: owner|partner)`. Membership is the authorization root for every policy. No multi-tenancy.
2. **No `letter_unlock_rules` table.** `letters.unlock_type (on_demand|scheduled)` + `letters.unlock_at`. A rules table is added only if a third condition type appears.
3. **Envelope/content split:** `letters` (label, status, unlock config: always readable to the partner when published) and `letter_contents` (body, photo path: readable only when unlocked). RLS filters rows, not columns, so this split is what keeps locked bodies out of API responses. The same pattern applies to `monthly_surprises` / `surprise_contents` in R2.
4. Status column (`draft|published`) on owner-authored content.
5. Timestamps `created_at`, `updated_at` (trigger-maintained) on all tables; `timestamptz` everywhere.

Indicative tables: `profiles`, `relationship`, `relationship_members`,
`story_milestones`, `letters`, `letter_contents`, `memories`, `love_reasons`
(R1 stretch), then `monthly_surprises`, `surprise_contents`,
`playlist_items` (R2), `easter_eggs` (R3).

## TD-008 Authentication: email + password, signups disabled — *Proposed* (pending Q6)

- **Why:** magic links on iOS open in the default browser, not a home-screen web app, which breaks session continuity and confuses the "it just opens" experience. A saved password via the iOS password manager is smoother.
- **Recovery:** owner-triggered password reset email.
- **Defense in depth:** even if signup were accidentally enabled, a non-member account can read nothing (FR-AUTH-01).
- **Alternative:** magic link only (no password to remember; worse on iOS home-screen).

## TD-009 Unlock enforcement in the database — *Proposed*

- Partner reads `letter_contents` only through RLS requiring: parent letter `published` **and** (`on_demand` **or** `unlock_at <= now()`).
- Opening goes through a `SECURITY DEFINER` function `open_letter(letter_id)` that re-checks the rule, records `first_opened_at`, and returns the content. The partner cannot update `letters` directly.
- Storage policies for letter attachments join to the same rule.
- Server clock only (DR-03). Changing the phone's clock cannot unlock anything.

## TD-010 Media: private bucket, signed URLs ~1 h, client-side compression — *Proposed*

- One private bucket `media`, path convention `{module}/{row_id}/{file}`.
- Signed URL lifetime ~60 min, cached per session (balances privacy against egress and gallery smoothness).
- Client-side resize to ≤ 2048 px and re-encode (WebP/JPEG) using native canvas. No extra dependency. iOS file pickers normally hand over JPEG for HEIC photos; unsupported formats get a clear error (tested).

## TD-011 Default unlock moment = anchor wall-clock minute — *Proposed*

- **Previous recommendation (this phase):** 00:00 on the monthsary day.
- **Revised:** the anchor's own minute, because it is shortly after midnight; one anchor for the counter and unlocks is simpler and more meaningful.
- **Impact:** none on schema; per-item override retained.

## TD-012 Keep-alive against free-tier pause — *Proposed*

- A scheduled job calls a harmless `keepalive()` database function every ~3 days.
- **Options:** (a) GitHub Actions cron (free; note: GitHub disables scheduled workflows after 60 days without repo activity, so needs a monthly check); (b) Vercel Cron (Hobby allows daily cron; requires one tiny serverless function). Choose in DESIGN.

## TD-013 Backups: automated, encrypted, off-platform — *Proposed* (pending Q3)

- Weekly scheduled `pg_dump` + storage object sync, **encrypted before leaving the runner** (the repo is public, and artifacts of public repos are broadly downloadable). Stored in a private location chosen by the owner.
- A restore drill into a fresh project is required before L.
- Secrets (DB password, encryption key) only in CI secret storage.

## TD-014 Supporting libraries — *Proposed*

| Library | Purpose | Justification |
|---|---|---|
| `react-router` | Routing + protected routes | Standard; small |
| `@tanstack/react-query` | Server state, caching, loading/error states | Removes hand-written fetch/caching code; caches signed URLs |
| `lucide-react` | Icons | Tree-shakeable |
| `vitest` + Testing Library | Unit/component tests | Vite-native |
| `@playwright/test` | E2E smoke tests | Real-browser verification incl. mobile viewport |

Rejected for now: state managers (Redux/Zustand: no shared client state to justify them), UI kits (would fight the bespoke look), form libraries (forms are small; revisit in DESIGN).

## TD-015 Environments — *Proposed*

- Two Supabase projects (free limit = 2): `dev` and `prod`. Migrations live in `supabase/migrations` and are applied to both. RLS tests run against `dev` with two test accounts.
- No personal content in `dev` or in seed files committed to git.

## TD-016 Repository privacy rule — *Approved by necessity, owner to confirm (Q3)*

- The repo is public. Therefore: no personal values, photos, messages, or real seed data in git; `.env*` ignored; docs reference config keys only. Making the repo private is recommended but not required for security, since security relies on auth + RLS, not obscurity.

---

## Change log

| Date | Decision | Change | Reason | Approval |
|---|---|---|---|---|
| THINK | TD-011 | 00:00 → anchor minute | Anchor is just after midnight; one anchor is simpler | Pending |
