# Requirements — Our Little Universe

| Field | Value |
|---|---|
| Status | **APPROVED by owner (THINK)** |
| Version | 0.1 |
| Priority key | **R1** = must ship at launch · **R2** = second monthsary · **R3** = later |

Every requirement has an ID so DESIGN, BUILD and VALIDATE can trace it.

---

## 1. Functional requirements

### 1.0 Private access — `AUTH`

| ID | Requirement | Rel. |
|---|---|---|
| FR-AUTH-01 | Only accounts listed as members of the relationship can read or write any personal content. | R1 |
| FR-AUTH-02 | Public self-registration is disabled at the auth-provider level. | R1 |
| FR-AUTH-03 | Accounts are provisioned only by the owner (invite or manual creation). | R1 |
| FR-AUTH-04 | All app routes require an authenticated member session. A visitor with no session sees only a neutral "scan your key" screen that reveals no personal content. | R1 |
| FR-AUTH-05 | Two roles: `owner` (full control) and `partner` (read released content + permitted contributions). | R1 |
| FR-AUTH-06 | Sessions persist across browser refresh and app relaunch on mobile. | R1 |
| FR-AUTH-07 | Sign-out is available from the navigation (owner); the partner has it in a less prominent place so she isn't signed out by accident. | R1 |
| FR-AUTH-08 | Recovery is documented. Partner: owner rotates her key and makes a new QR. Owner: password reset email. | R1 |
| FR-AUTH-09 | **Partner QR key sign-in:** scanning the partner's QR code signs her into her account automatically, with no login screen and nothing typed. The key is carried in the URL fragment (`#…`, never sent to servers) and removed from the address bar immediately after sign-in. | R1 |
| FR-AUTH-10 | **Owner sign-in:** email + password on a separate owner sign-in route that isn't linked from the partner experience. | R1 |
| FR-AUTH-11 | **Key rotation:** the owner can revoke the partner's key and generate a new QR. Rotation invalidates the old key and ends existing partner sessions. R1 does this through a documented Supabase dashboard procedure; R2 adds an in-app button. | R1 (procedure) / R2 (UI) |
| FR-AUTH-12 | The QR code is generated offline or locally by the owner. The key is never committed to git, logged, or stored in plain text in the database. | R1 |

### 1.1 Relationship settings — `SET`

| ID | Requirement | Rel. |
|---|---|---|
| FR-SET-01 | Owner can set `start_at` (date + time) and `timezone` (IANA name). Neither is hardcoded. | R1 |
| FR-SET-02 | Owner can set display names and the counter message (e.g. "Every day with you is another favorite memory."). | R1 |
| FR-SET-03 | Owner can define special dates (e.g. first anniversary) with a label. | R2 |
| FR-SET-05 | *(Proposed in DESIGN, A1)* Owner can write a welcome message shown once, in an envelope, on the partner's first visit. | R1 if approved |
| FR-SET-04 | Owner can toggle partner contribution permissions per module. | R2 (R1 uses fixed defaults) |

### 1.2 Our Story — `STORY`

| ID | Requirement | Rel. |
|---|---|---|
| FR-STORY-01 | Chronological timeline of milestones (date, title, caption, optional photo). | R1 |
| FR-STORY-02 | An introductory story text block at the top of the timeline. | R1 |
| FR-STORY-03 | Owner can create, edit, delete and reorder milestones. | R1 |
| FR-STORY-04 | Milestones can be flagged as highlighted (anniversary-style emphasis). | R1 |
| FR-STORY-05 | Designed empty state when there are few or no milestones. | R1 |

### 1.3 Monthsary Counter — `COUNT`

| ID | Requirement | Rel. |
|---|---|---|
| FR-COUNT-01 | Displays elapsed years, months, days, hours, minutes since `start_at`, computed in `timezone`. | R1 |
| FR-COUNT-02 | Updates live (at least once per minute) without refresh. | R1 |
| FR-COUNT-03 | Shows the next monthsary (number + date) and a countdown to it. | R1 |
| FR-COUNT-04 | Shows the personalized counter message. | R1 |
| FR-COUNT-05 | Recognizes and specially presents monthsary days and anniversaries. | R1 (monthsary) / R2 (special dates) |
| FR-COUNT-06 | Calculation follows DR-01…DR-05. | R1 |

### 1.4 Open When Letters — `LETTER`

| ID | Requirement | Rel. |
|---|---|---|
| FR-LETTER-01 | Envelope grid showing each letter's "Open when…" label and lock state. | R1 |
| FR-LETTER-02 | Two unlock types: **on_demand** (openable any time, e.g. "when you're sad") and **scheduled** (openable at/after `unlock_at`). | R1 |
| FR-LETTER-03 | Animated envelope-opening reveal. | R1 |
| FR-LETTER-04 | Letter body plus optional photo. | R1 |
| FR-LETTER-05 | Optional audio message. | R2 |
| FR-LETTER-06 | Read status: records first-opened time; shows unread/read on the envelope. | R1 |
| FR-LETTER-07 | Owner can create, edit, delete letters and set draft/published + unlock config. | R1 |
| FR-LETTER-08 | **A locked or draft letter's body and attachments are never returned to the partner by any API, storage request, or page payload.** Enforced by the database. | R1 |
| FR-LETTER-09 | Scheduled locked letters show a countdown to unlock. | R1 |

### 1.5 Our Memories — `MEM`

| ID | Requirement | Rel. |
|---|---|---|
| FR-MEM-01 | Gallery of polaroid-style cards (photo, caption, date). | R1 |
| FR-MEM-02 | Individual memory view (full photo, caption, date, who added it). | R1 |
| FR-MEM-03 | Upload a photo with caption and date; images are resized/compressed client-side before upload. | R1 |
| FR-MEM-04 | Replace and delete a memory's photo; delete removes the storage object. | R1 |
| FR-MEM-05 | Partner can contribute memories (default permission, Q4). | R1 |
| FR-MEM-06 | Memory categories and timeline filtering. | R2 |
| FR-MEM-07 | Photos are stored privately and served via signed URLs to members only. | R1 |

### 1.6 Reasons Why I Love You — `REASON`

| ID | Requirement | Rel. |
|---|---|---|
| FR-REASON-01 | Numbered reasons (`Reason #001`), owner-authored. | R1 stretch / R2 |
| FR-REASON-02 | Random reveal with animation; avoid repeating the last shown reason. | R1 stretch / R2 |
| FR-REASON-03 | Owner CRUD; optional category. | R1 stretch / R2 |
| FR-REASON-04 | Partner can mark favorites. | R2 |

### 1.7 Monthly Surprise — `SURP` (R2)

| ID | Requirement |
|---|---|
| FR-SURP-01 | One or more surprises per monthsary with a configurable unlock moment (default: monthsary anchor minute). |
| FR-SURP-02 | Draft → ready → published workflow; only published + due surprises are visible to the partner. |
| FR-SURP-03 | Countdown for the next surprise; archive of past surprises. |
| FR-SURP-04 | Same database-enforced protection as FR-LETTER-08. |

> R1 note: a scheduled letter "Open when it's our monthsary" covers the
> launch-day surprise without the full Surprise module.

### 1.8 Our Playlist — `PLAY` (R2)

| ID | Requirement |
|---|---|
| FR-PLAY-01 | Song title, artist, external link (Spotify/YouTube), optional artwork URL, personal note. |
| FR-PLAY-02 | Owner-defined ordering. |
| FR-PLAY-03 | Official embeds where supported; a plain link + note still displays if the embed fails. |
| FR-PLAY-04 | No downloading or rehosting of audio. |

### 1.9 Easter Eggs — `EGG` (R3)

| ID | Requirement |
|---|---|
| FR-EGG-01 | Configurable triggers (tap hidden element, sequence, visit set of sections, specific date). |
| FR-EGG-02 | Hidden content protected server-side where it is secret (secret-combination answers validated by the database). |
| FR-EGG-03 | Works with touch and mouse; no essential feature hidden behind an egg. |

### 1.10 Owner content management — `ADMIN`

| ID | Requirement | Rel. |
|---|---|---|
| FR-ADMIN-01 | Owner edits content **in place** within each module (edit controls visible only to owner). | R1 |
| FR-ADMIN-02 | Draft vs. published status on letters, milestones, memories (owner-authored), surprises. | R1 |
| FR-ADMIN-03 | Owner "preview as partner" toggle to see exactly what she will see. | R1 |
| FR-ADMIN-04 | Consolidated settings/permissions screen. | R2 |
| FR-ADMIN-05 | Storage usage readout vs. free-tier limit. | R2 |

---

## 2. Date rules — `DR`

| ID | Rule |
|---|---|
| DR-01 | Monthsary *n* = anchor date + *n* calendar months, in `relationship.timezone`, keeping the anchor's wall-clock time. If the target month has fewer days than the anchor's day, use the month's last day. Each monthsary is computed from the **anchor**, never from the previous monthsary (prevents drift: 31 → 28 → 28…). |
| DR-02 | Elapsed duration = whole years, then whole months, then days, hours, minutes, using DR-01 for month boundaries. |
| DR-03 | All "is it unlocked?" decisions use the **database server clock** (`now()`), never the device clock. |
| DR-04 | Timestamps stored as `timestamptz` (UTC); converted to `relationship.timezone` only for display/calculation. |
| DR-05 | Leap years and DST transitions are handled by the date library's timezone support; covered by unit tests even when the configured zone has no DST. |

---

## 3. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | Row Level Security enabled on **every** table in the exposed schema; default deny. |
| NFR-02 | Security | Storage bucket private; access policies mirror table policies (including unlock rules). |
| NFR-03 | Security | No service-role key in the frontend, repo, or client bundle. |
| NFR-04 | Privacy | No personal data or secrets committed to the (public) repository. `.env*` gitignored. |
| NFR-05 | Privacy | `noindex, nofollow` via `robots.txt`, meta tag, and `X-Robots-Tag` header. |
| NFR-06 | Privacy | No third-party analytics or trackers. Embeds (Spotify/YouTube) load only on the playlist screen. |
| NFR-07 | Privacy | No personal content written to logs. |
| NFR-08 | Performance | First load on a mid-range phone over 4G: usable in ≤ 3 s (target). Animation libraries loaded only where used. |
| NFR-09 | Performance | Uploaded images resized to ≤ 2048 px longest edge and compressed (target ≤ 500 KB each). |
| NFR-10 | Responsiveness | Mobile-first; works 360 px → desktop widths; touch targets ≥ 44 px. |
| NFR-11 | Accessibility | WCAG 2.1 AA contrast for text; `prefers-reduced-motion` respected; all interactions keyboard-reachable on desktop. |
| NFR-12 | Reliability | Keep-alive prevents free-tier project pause (TD-012). |
| NFR-13 | Durability | Automated, encrypted, off-platform backups of database + storage; documented and rehearsed restore (TD-013). |
| NFR-14 | Cost | All services on free tiers; usage limits documented; no paid feature enabled without approval. |
| NFR-15 | Maintainability | TypeScript strict mode; no `any` without justification; feature-modular folders. |
| NFR-16 | Browser support | **Test priority 1: Chrome on Android** (partner's device); Samsung Internet if her phone is a Samsung. Also supported: latest 2 versions of Safari iOS and Chrome/Edge/Firefox/Safari desktop (owner). |

---

## 4. Default permission matrix (R1)

| Resource | Owner | Partner |
|---|---|---|
| Relationship settings | read/write | read |
| Story milestones | CRUD (incl. drafts) | read published |
| Letters (envelope) | CRUD | read published |
| Letter contents | CRUD | read only when published **and** (on_demand **or** `unlock_at ≤ now()`) |
| Letter read status | read | set on open (via database function) |
| Memories | CRUD all | create; read all published; edit/delete **own** |
| Love reasons | CRUD | read published; favorite (R2) |
| Media files | all | read files whose parent row she can read; upload/delete files for own memories |

**Confirmed by owner (Q4 = option A: memories only).** Clarifications:

- Partner-created memories are published immediately (no draft step for her).
- The owner can still edit or delete any memory (e.g. to remove an accidental upload). The partner cannot edit or delete the owner's memories.
- Every memory records `created_by`, which drives the "edit/delete own" rule in RLS and storage policies.
