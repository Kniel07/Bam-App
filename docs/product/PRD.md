# PRD — Our Little Universe

> *A little corner of the internet, made just for us.*

| Field | Value |
|---|---|
| Document status | **DRAFT — awaiting owner approval (THINK phase)** |
| Version | 0.1 |
| Phase | 1 — THINK |
| Related | [REQUIREMENTS.md](./REQUIREMENTS.md) · [MVP-SCOPE.md](./MVP-SCOPE.md) · [TECHNICAL-DECISIONS.md](../architecture/TECHNICAL-DECISIONS.md) · [RISK-REGISTER.md](../architecture/RISK-REGISTER.md) |

> **Privacy note.** This repository is public. Personal values (relationship
> start moment, timezone, names, messages, photos) are **never** written in
> this repository. They live only in the private database. Documents refer to
> them by their configuration key, e.g. `relationship.start_at`.

---

## 1. Problem & purpose

Two people want one permanent, private place that preserves their memories,
marks each monthsary, and delivers small personal surprises. Chat apps bury
moments; social platforms are public and not designed for two. A purpose-built
private site gives the recipient a reason to come back every monthsary and
lets the relationship's story accumulate in one place.

## 2. Product vision

A private, mobile-first web app that feels like a **digital scrapbook +
interactive love letter + relationship timeline + collection of surprises**.
It must feel intentionally made for one person, not like a template.

## 3. Users

Exactly two. No other users will ever exist.

| Role | Who | Core needs |
|---|---|---|
| `owner` | The creator | Author and schedule content; prepare surprises in secret; manage settings; keep data safe. |
| `partner` | The recipient | Discover, read, revisit; contribute memories (if permitted); never see unreleased content early. |

Primary device assumption: **mobile phone browser** (exact device pending — see §9).

## 4. Goals & success measures

Non-commercial, so success is qualitative but testable:

| Goal | Evidence of success |
|---|---|
| G1 Celebrate milestones | Counter is always correct; each monthsary has something new unlocked at the anchor minute. |
| G2 Preserve memories permanently | Content survives refresh, device change, and a backup → restore drill. |
| G3 Deliver personal surprises | Scheduled content is invisible (UI, network, API) until its unlock moment. |
| G4 Invite revisiting | The partner returns on monthsaries (anecdotal). |
| G5 Easy to grow | Owner adds any content without touching code or the database console. |

## 5. Non-goals

- Public profiles, sharing, social features, comments, chat.
- Multi-couple / multi-tenant support.
- Notifications (email, push) in v1.
- Native mobile apps.
- AI-generated personal content. All personal content is written by the owner.
- Paid services or subscriptions.

## 6. Experience modules

| # | Module | One-line intent | Release |
|---|---|---|---|
| 00 | Private access | Only the two accounts can enter. | **R1** |
| 01 | Our Story | A timeline of how it all began. | **R1** |
| 02 | Monthsary Counter | Years/months/days/hours/minutes together + next monthsary. | **R1** |
| 03 | Open When Letters | Envelopes opened on feeling or on a date. | **R1** |
| 04 | Our Memories | Polaroid scrapbook of photos. | **R1** (v1) |
| 07 | Reasons Why I Love You | Random numbered love reasons. | R1 stretch / **R2** |
| 05 | Monthly Surprise | Something new each monthsary, with countdown + archive. | **R2** |
| 06 | Our Playlist | Songs with personal notes and embeds. | **R2** |
| 08 | Secret Easter Eggs | Hidden discoveries. | **R3** |
| — | Owner content editing | Add/edit/delete content in place. | **R1** |
| — | Settings & permissions screen | Consolidated admin. | **R2** |

Release definitions are in [MVP-SCOPE.md](./MVP-SCOPE.md).

## 7. Key product rules

1. **The anchor moment.** One configured moment, `relationship.start_at`, in
   one configured IANA timezone, `relationship.timezone`, drives the counter,
   every monthsary, and default unlock times.
2. **Monthsary = same day-of-month and same wall-clock minute as the anchor**,
   in the relationship timezone. If a month lacks that day, it falls on the
   month's last day (rule DR-01 in REQUIREMENTS).
3. **Default unlock time = the anchor's wall-clock minute** on the unlock date
   (decision TD-011). Overridable per item.
4. **Nothing unreleased is visible to the partner.** Drafts and future-dated
   content are withheld by the database, not hidden by the UI.
5. **Placeholders over invention.** Empty sections show designed empty states;
   no fake memories are seeded.

## 8. Constraints

- Free tiers only; no always-on server; no paid APIs.
- Public source repository → no personal data or secrets in git.
- Fixed launch: the first monthsary (see MVP-SCOPE §2).

## 9. Open questions (asked one at a time)

| # | Question | Default if unanswered | Blocks |
|---|---|---|---|
| Q1 | ~~Relationship anchor moment & timezone~~ | **Answered** (stored privately) | — |
| Q2 | ~~Launch target~~ | **Answered: first monthsary** | — |
| Q3 | ~~Keep repo public or make it private?~~ | **Answered: public until deployment, then private** (TD-016) | — |
| Q4 | What may the partner create/edit? | Memories only (create/edit/delete own) | RLS design |
| Q5 | Partner's main device/browser | iPhone Safari (test priority) | Test matrix |
| Q6 | Sign-in method | Email + password (TD-008) | Auth design |
| Q7 | Language (English / Tagalog / Taglish) | English UI, content in any language | Copy |
| Q8 | Display names / nicknames | Placeholders `[OWNER_NAME]`, `[PARTNER_NAME]` | Copy |
| Q9 | Custom domain? | Default `*.vercel.app` | Deployment |
| Q10 | Existing GitHub/Supabase/Vercel accounts? | Owner creates free accounts | Build start |
| Q11 | Does the partner know the site exists before launch? | No, it's a surprise | Launch checklist |

## 10. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Owner | `[OWNER]` | Pending | — |
| Independent reviewer | `[REVIEWER]` | Pending | — |
