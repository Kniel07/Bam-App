# Technical Decisions — Our Little Universe

| Field | Value |
|---|---|
| Status | **APPROVED (THINK)**. Later changes go through the change log |
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

## TD-001 Frontend: React + Vite + TypeScript (strict) — *Approved (owner, THINK)*

- **Why:** static SPA, no server needed, fast dev loop, large ecosystem.
- **Alternatives:** Next.js (SSR unnecessary; adds server runtime concepts); Astro (less suited to app-like interactivity).
- **Trade-off:** SPA has no SEO, which we explicitly don't want anyway.

## TD-002 Styling: Tailwind CSS — *Approved (owner, THINK)*

- **Why:** design tokens live in one config; consistent spacing/colour; small CSS output.
- **Alternative:** CSS Modules (more files, tokens duplicated by hand).

## TD-003 Backend: Supabase (Postgres, Auth, Storage, RLS) — *Approved (owner, THINK)*

- **Why:** the only free option giving **database-enforced authorization** without running a server. Locking letters by `now()` in a policy is exactly what we need.
- **Alternatives:** Firebase (security rules workable but NoSQL; weaker relational modelling); custom Spring Boot API (needs an always-on host, so not free; more to maintain).
- **Trade-off:** free-tier pause and no backups → mitigated by TD-012, TD-013.

## TD-004 Hosting: Vercel Hobby — *Approved (owner, THINK)*

- **Why:** free for personal non-commercial use, Git-based deploys, custom headers (`X-Robots-Tag`).
- **Alternatives:** Netlify / Cloudflare Pages (equivalent; either is a fine fallback).

## TD-005 Dates: date-fns v4 + `@date-fns/tz` — *Approved (owner, THINK)*

- **Why:** month-end and timezone maths is error-prone; tree-shakeable, well tested.
- **Alternatives:** native `Temporal` (cleanest API, but support across every browser the owner might use, especially Safari, must be confirmed; the partner uses Android); Luxon (heavier); hand-written (rejected: risk).
- All monthsary logic lives in one pure module (`lib/dates`) with exhaustive unit tests (DR-01…05).

## TD-006 Animation: Motion (formerly Framer Motion), scoped — *Approved (owner, THINK)*

- **Why:** the envelope opening and reveals need orchestrated, interruptible animation.
- **Constraint:** lazy-loaded only on screens that use it; ambient effects (floating hearts) in CSS; `prefers-reduced-motion` honoured.
- **Alternative:** CSS-only (lighter, but complex sequences become brittle).

## TD-007 Data model shape — *Approved (owner, THINK)* (ERD in DESIGN)

1. **Single relationship row** + `relationship_members (user_id, role: owner|partner)`. Membership is the authorization root for every policy. No multi-tenancy.
2. **No `letter_unlock_rules` table.** `letters.unlock_type (on_demand|scheduled)` + `letters.unlock_at`. A rules table is added only if a third condition type appears.
3. **Envelope/content split:** `letters` (label, status, unlock config: always readable to the partner when published) and `letter_contents` (body, photo path: readable only when unlocked). RLS filters rows, not columns, so this split is what keeps locked bodies out of API responses. The same pattern applies to `monthly_surprises` / `surprise_contents` in R2.
4. Status column (`draft|published`) on owner-authored content.
5. Timestamps `created_at`, `updated_at` (trigger-maintained) on all tables; `timestamptz` everywhere.

Indicative tables: `profiles`, `relationship`, `relationship_members`,
`story_milestones`, `letters`, `letter_contents`, `memories`, `love_reasons`
(R1 stretch), then `monthly_surprises`, `surprise_contents`,
`playlist_items` (R2), `easter_eggs` (R3).

## TD-008 Authentication: owner password + partner QR key — *Approved (owner, THINK)*

- **Owner:** email + password on a separate, unlinked owner route. The owner account can see drafts and future content, so it keeps the stronger factor.
- **Partner, "QR key":** the QR code encodes `https://<app>/key#<secret>`. `<secret>` is a long random value (≥ 32 bytes of entropy) used as her account password. On load, the app reads the fragment, signs in with her account email + secret, replaces the URL to drop the fragment, and keeps the session (refresh token) on that device. She never sees a login screen.
- **Why the fragment:** browsers don't send `#…` to servers, so the key stays out of Vercel/Supabase request logs and referrers.
- **Revocation:** changing her password (= rotating the key) invalidates the old card; sign-out of all her sessions is forced at the same time. A new QR is produced locally.
- **Rejected alternatives:**
  - *Secret link with no accounts:* anyone with a copy has permanent, irrevocable access; breaks RLS roles, drafts, early-surprise protection and "own memories" rules; contradicts the security principle "a private URL is not private access".
  - *Single-use QR via serverless function:* stronger, but a printed keepsake card would stop working after the first scan, and it adds a moving part.
- **Accepted residual risk:** whoever holds the physical/photographed QR can enter until the key is rotated (R15). Comparable to a house key.
- **Defense in depth:** public signups disabled; non-member accounts can read nothing (FR-AUTH-01); Supabase auth rate limits apply.

## TD-009 Unlock enforcement in the database — *Approved (owner, THINK)*

- Partner reads `letter_contents` only through RLS requiring: parent letter `published` **and** (`on_demand` **or** `unlock_at <= now()`).
- Opening goes through a `SECURITY DEFINER` function `open_letter(letter_id)` that re-checks the rule, records `first_opened_at`, and returns the content. The partner cannot update `letters` directly.
- Storage policies for letter attachments join to the same rule.
- Server clock only (DR-03). Changing the phone's clock cannot unlock anything.

## TD-010 Media: private bucket, signed URLs ~1 h, client-side compression — *Approved (owner, THINK)*

- One private bucket `media`, path convention `{module}/{row_id}/{file}`.
- Signed URL lifetime ~60 min, cached per session (balances privacy against egress and gallery smoothness).
- Client-side resize to ≤ 2048 px and re-encode (WebP/JPEG) using native canvas. No extra dependency. iOS file pickers normally hand over JPEG for HEIC photos; unsupported formats get a clear error (tested).

## TD-011 Default unlock moment = anchor wall-clock minute — *Approved (owner, THINK)*

- **Previous recommendation (this phase):** 00:00 on the monthsary day.
- **Revised:** the anchor's own minute, because it is shortly after midnight; one anchor for the counter and unlocks is simpler and more meaningful.
- **Impact:** none on schema; per-item override retained.

## TD-012 Keep-alive against free-tier pause — *Approved (owner, THINK)*

- A scheduled job calls a harmless `keepalive()` database function every ~3 days.
- **Options:** (a) GitHub Actions cron (free; note: GitHub disables scheduled workflows after 60 days without repo activity, so needs a monthly check); (b) Vercel Cron (Hobby allows daily cron; requires one tiny serverless function). Choose in DESIGN.

## TD-013 Backups: automated, encrypted, off-platform — *Approved (owner, THINK)*

- Weekly scheduled `pg_dump` + storage object sync, **always encrypted before leaving the runner**. Required while the repo is public (public-repo artifacts are broadly downloadable) and kept after it goes private as defense in depth. Stored in a private location chosen by the owner.
- A restore drill into a fresh project is required before L.
- Secrets (DB password, encryption key) only in CI secret storage.

## TD-014 Supporting libraries — *Approved (owner, THINK)*

| Library | Purpose | Justification |
|---|---|---|
| `react-router` | Routing + protected routes | Standard; small |
| `@tanstack/react-query` | Server state, caching, loading/error states | Removes hand-written fetch/caching code; caches signed URLs |
| `lucide-react` | Icons | Tree-shakeable |
| `vitest` + Testing Library | Unit/component tests | Vite-native |
| `@playwright/test` | E2E smoke tests | Real-browser verification incl. mobile viewport |

Rejected for now: state managers (Redux/Zustand: no shared client state to justify them), UI kits (would fight the bespoke look), form libraries (forms are small; revisit in DESIGN).

## TD-015 Environments — *Approved (owner, THINK)*

- Two Supabase projects (free limit = 2): `dev` and `prod`. Migrations live in `supabase/migrations` and are applied to both. RLS tests run against `dev` with two test accounts.
- No personal content in `dev` or in seed files committed to git.

## TD-016 Repository privacy rule — *Approved (owner, THINK)*

- **Owner decision:** the repo stays public until deployment, then becomes private.
- **Rule (permanent, not only while public):** no personal values, photos, messages, or real seed data in git; `.env*` ignored; docs reference config keys only.
- **Why permanent:** making a repo private later does not erase what was public. Earlier commits may already be cloned, forked, or cached. Everything committed during the public period must be safe to stay public forever.
- Security never depends on repo visibility: it relies on auth + RLS, not obscurity.
- Post-deployment action: owner switches visibility to private (added to the launch checklist). Vercel Hobby can deploy from a private personal repo; GitHub Actions on private repos use the free minutes quota, more than enough for weekly backup + keep-alive.

## TD-017 Address: free Vercel subdomain — *Approved (owner, THINK)*

- The site lives at `<project-name>.vercel.app`. No custom domain, $0.
- **The address is permanent once the QR card is printed.** The Vercel project name must be final before the first QR is generated; renaming the project later breaks the card.
- Project name must **not** contain personal names (keeps the address non-identifying). Final name chosen by the owner at deployment.
- Only the production address goes on the QR. Preview deployments keep Vercel's default deployment protection; they are also behind app sign-in and RLS.
- Changing to a custom domain later is possible, but needs a redirect from the old address so printed cards keep working. That would be a change request.

## TD-018 Partner login identity: synthetic address — *Approved (owner, DESIGN)*

- The partner's Supabase user uses a synthetic, non-personal login address on a reserved domain. Her real email is never stored. The constant may appear in the public JS bundle because it reveals nothing.
- **Why:** QR sign-in needs a login identifier on the client. Putting her real email in the bundle (public) or in the QR would expose personal data. Recovery doesn't need email, since the owner rotates the key.
- **Fallback** if Supabase rejects the address: a plus-addressed variant of the owner's own mailbox.

## TD-019 Letter content readable only through `open_letter()` — *Approved (owner, DESIGN)*, refines TD-009

- **Previous (TD-009):** partner may SELECT `letter_contents` via RLS when unlocked; `open_letter()` records read status.
- **Proposed:** partner has **no** SELECT policy on `letter_contents`; `open_letter()` is the single path.
- **Reason:** one code path to secure and test; read status can't be bypassed; removes a whole class of policy mistakes.
- **Impact:** none on UX; slightly simpler RLS.

## TD-020 Keep-alive and backups on GitHub Actions — *Approved (owner, DESIGN)*, resolves TD-012 options

- Both jobs in GitHub Actions (one platform, free). The 60-day inactivity auto-disable applies to scheduled workflows in public repos; the repo goes private after launch (TD-016). The monthly maintenance check stays as a safety net.
- Backups encrypted with `age` to a public recipient key; the private key stays offline with the owner.

## TD-021 Letters go both ways (CR-01) — *Approved (owner, BUILD)*

- Both members write letters for each other. **Author** (`letters.created_by`): full control of own letters and reads own content anytime. **Recipient** (the other member): sees published envelopes; reads content only via `open_letter()` once open. **Owner**: may also delete any letter he can see.
- Drafts are private to their author; the owner can no longer read the partner's letters before they unlock (her surprises stay surprises).
- `open_letter()` now records read status for the recipient (not "the partner") and returns `author_id` for the signature.
- Migration `0008_partner_letters.sql`; tests `supabase/tests/partner_letters.test.sql` (32 assertions).

## TD-022 Shared authorship for all content (CR-02) — *Approved (owner, BUILD)*

- One rule for every content section: **both members add; each edits/deletes their own; drafts are private to their author; the owner may also remove anything he can see.** Applies to letters (TD-021), memories, Our Story (migration `0009_shared_story.sql`), and future modules (reasons, surprises, playlist).
- Settings, partner key and the anchor moment remain **owner-only** (they govern the whole site and its security).
- Storage policies consolidated: read follows row visibility; upload needs a new folder or your own row; overwrite only by the uploader; delete by the uploader or the owner.

## TD-023 Featured photos on Home (CR-03) — *Approved (owner, BUILD), delivered in S5*

- Either member can mark a memory as featured; featured memories appear on Home. Implemented with S5 Memories (`memories.is_featured`).

## TD-024 Phone notifications via Web Push (CR-04) — *Approved (owner, BUILD)*

- Installed app (PWA) receives Web Push: push-only service worker (no caching), `push_subscriptions` (RLS: own devices), `notification_log` (exactly once), `claim_due_notifications()` (service role only), Edge Function `notify` called every minute by Supabase Cron.
- Phase A at launch: N1 letter unlocked → recipient; N2 monthsary → both. Phase B (new content) after launch.
- Generic notification text only; tap opens the app behind sign-in. Design: `docs/design/CR-04-NOTIFICATIONS.md`.
- Edge Function deployed with JWT verification off: calling it only delivers due events once, so a public trigger is harmless; avoids storing any key in the cron job.

---

## Change log

| Date | Decision | Change | Reason | Approval |
|---|---|---|---|---|
| THINK | TD-011 | 00:00 → anchor minute | Anchor is just after midnight; one anchor is simpler | **Approved by owner** |
| BUILD | PRD §5 non-goal → TD-024 | **Previous:** no notifications in v1. **New:** Web Push to the installed app (Phase A at launch) | Owner request: "notifications for the installed mobile app" | **Approved by owner** |
| BUILD S4 | Q4 → TD-022 | **Previous:** partner adds memories (and letters, CR-01) only. **New:** partner adds to every content section; author model everywhere; settings stay owner-only | Owner request: "give her adding access to all" | **Approved by owner** |
| BUILD S4 | New TD-023 | Featured photos shown on Home | Owner request: "partner can add feature photos… shown on the homepage" | **Approved by owner** (S5) |
| BUILD S4 | Q4 / TD-009 / TD-019 → TD-021 | **Previous:** partner reads letters only; owner reads all content. **New:** both write letters; author + recipient model; owner may delete any visible letter but cannot read her letters before they unlock | Owner request: "add the create letter for the partner" | **Approved by owner** |
| BUILD S0 | TD-002 detail | Tokens declared in CSS `@theme` (Tailwind v4) instead of a JS theme config | Tailwind v4's native mechanism; same single source of truth | Implementation detail, no approval needed |
| BUILD S0 | TD-001 detail | TypeScript pinned to 5.9.3 (not 7.x) | typescript-eslint tooling not yet reliable on TS 7 | Implementation detail |
| BUILD S0 | TD-014 detail | react-router pinned to 7.18.5 | Patched release; avoids advisories in older 7.x | Implementation detail |
| DESIGN | TD-009 → TD-019 | Partner reads letter content only via `open_letter()` | Single secured path | **Approved by owner** |
| THINK | TD-008 | **Previous:** email + password for both users. **New:** owner password; partner signs in by scanning a QR key (no login screen) | Owner wants no login for the partner, access by unique QR code. Option chosen keeps real accounts, RLS roles and revocation | **Approved by owner** |
