# Risk Register — Our Little Universe

| Field | Value |
|---|---|
| Status | Living document |
| Version | 0.1 (THINK) |
| Scale | Likelihood / Impact: L · M · H |

| ID | Risk | L | I | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R1 | Supabase free project **pauses after 1 week of inactivity**; site is down on a monthsary | H | H | **Critical** | Keep-alive job (TD-012); monthly check that the job is still enabled; documented un-pause steps | Owner | **Mitigation built (S6)**; active once owner adds secrets (SETUP-GUIDE G1) |
| R2 | **Data loss**: free tier lacks downloadable backups; memories are irreplaceable | M | H | **High** | Encrypted automated backups + restore drill before launch (TD-013) | Owner | **Mitigation built (S6)**; open until the owner's restore drill passes (G4) |
| R3 | **Locked content leaks** via API, storage URL, or page payload | M | H | **High** | Envelope/content split + RLS + `open_letter()` + storage policies (TD-007, TD-009); direct-API tests as the partner | Build/Validate | Open |
| R4 | **Launch date slips**: 23 days for 4 phases + content writing | M | H | **High** | Fixed-date, flexible-scope plan; cut order defined (MVP-SCOPE §3) | Owner | Open |
| R5 | **Personal data exposed in the public repo** (public until deployment; going private later does not erase history) | M | M | **High** | Permanent no-personal-data rule (TD-016); `.env*` ignored; scan before every commit; switch to private after deployment (launch checklist) | Owner | Open |
| R6 | Account takeover (weak password / shared device) | L | H | Medium | Strong passwords + password manager; signups off; sessions revocable; membership check | Owner | Open |
| R7 | Storage quota (1 GB) or egress (5 GB) exhausted | L | M | Medium | Client-side compression, size caps, URL caching; usage readout (R2) | Build | Open |
| R8 | Monthsary / timezone calculation errors | L | M | Medium | Single date module, DR-01…05, exhaustive unit tests incl. month-end and leap cases | Build/Validate | Open |
| R9 | Unusual photo formats (HEIF on some Android/Samsung cameras, HEIC from owner's iPhone) or huge images fail to upload | L | L | Low | Accept `image/*`, canvas re-encode, clear error message; tested on Android Chrome first | Build/Validate | Open |
| R10 | Surprise spoiled: partner finds site/content early | L | M | Low | Draft/published status; partner account created at L; preview-as-partner | Owner | Open |
| R11 | Scheduled keep-alive/backup silently disabled (GitHub 60-day rule) | M | M | Medium | Monthly maintenance checklist (SETUP-GUIDE G5); GitHub emails on failure; repo goes private after launch | Owner | Open (mitigated) |
| R12 | External embeds (Spotify/YouTube) unavailable or tracking | L | L | Low | Fallback link + note; embeds loaded only on playlist screen | Build | Open (R2) |
| R13 | Over-animation hurts performance or accessibility | M | L | Low | Scoped Motion usage; reduced-motion support; perf budget NFR-08 | Design/Build | Open |
| R14 | Free-tier terms change | L | M | Low | Limits re-checked before deploy; documented in TECHNICAL-DECISIONS | Owner | Open |
| R15 | **Partner QR card lost, photographed, or shared** → someone else can enter as the partner | L | H | Medium | Key in URL fragment (not logged), removed from address bar after sign-in; owner rotates key + reprints (FR-AUTH-11); owner account unaffected (separate password) | Owner | Open (accepted residual) |
| R16 | **Home-screen web app sign-in mismatch.** Lowered: partner uses Android, where Chrome-installed web apps share Chrome's sign-in. Remaining case: her phone's QR scanner opens a different default browser (e.g. Samsung Internet) than the one she later uses | L | M | Low | Test the QR scan → browser path on her actual phone; if the browsers differ, she rescans once in the right one | Validate | Open |
| R17 | Site address changes after the QR card is printed → card stops working | L | M | Low | Project name fixed before the first QR is generated (TD-017); any later domain change requires a redirect | Owner | Open |
| R18 | Backup artifacts exceed the free GitHub artifact quota as photos grow | M | M | Medium | 30-day retention; monitor size; switch to DB-only artifacts + owner's monthly encrypted media download (ARCHITECTURE §6) | Owner | Open |
| R19 | Push delivery delayed or blocked (battery savers, denied permission, Cron/Edge limits) | M | L | Low | Notifications are a bonus: unlocking never depends on them; setup guide covers battery settings; in-app dots remain | Owner | Open |

## Review cadence

Re-assess at the end of each phase and at every monthsary.
