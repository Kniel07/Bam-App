# CR-04 — Phone Notifications (Design Proposal)

| Field | Value |
|---|---|
| Status | **APPROVED by owner (BUILD), with amendment A-1** |
| Requested by | Owner ("add notifications for phone of the web app") |
| Changes | PRD §5 non-goal "Notifications (email, push) in v1" → in scope |
| Related | TD-003 (Supabase), TD-008/TD-018 (no partner email), ARCHITECTURE §6 |

## 0. Amendment A-1 (owner): the installed app is the target

"What I need is for the installed mobile app to have its notifications."
The app must be properly installable on Android (PNG icons incl. maskable,
monochrome status-bar badge, complete manifest, an "Install the app" action in
More). Notifications then arrive with the app's own name and icon. The browser
tab also works, but the installed app is the primary experience. On iPhone,
Web Push works only for the installed (Home Screen) app, iOS 16.4+.

## 1. Goal

Deliver a notification to a member's phone, even when the site is closed, at
the moments that give her a reason to come back.

## 2. Options

| Option | Reaches her phone when the site is closed? | Fits constraints? | Verdict |
|---|---|---|---|
| **A. Web Push** (service worker + Supabase Edge Function + Supabase Cron) | Yes (Android Chrome, no app install) | Free tier, no always-on server | **Recommended** |
| B. Email | Yes | ❌ Her account has no real email by design (TD-018) | Rejected |
| C. In-app only (dots, "Waiting for you") | No | Already built | Not a phone notification |

## 3. Events (proposed)

| # | Event | Who gets it | When | Phase |
|---|---|---|---|---|
| N1 | A scheduled letter **unlocks** for you | Recipient | At `unlock_at` (± 1 min) | A (launch) |
| N2 | **Monthsary** begins | Both | At the anchor minute | A (launch) |
| N3 | The other person **added** a letter, milestone or memory | The other member | Within ~1 min of publishing | B |

## 4. Privacy rules

- **Generic text only on the lock screen**: never letter text, labels, captions or names.
  - N1 "A letter just unlocked for you 💌" · N2 "Happy monthsary 💗" · N3 "Something new is waiting in our little universe ✨"
- Tapping opens the relevant page; the content stays behind sign-in and RLS.
- Push payloads are end-to-end encrypted by the Web Push protocol; the push service (Google FCM for Chrome) cannot read them.
- Each person opts in on their own phone (browser permission prompt); they can turn it off any time in More → Notifications.

## 5. Architecture

```
Phone (Chrome) ──subscribe──▶ push_subscriptions (RLS: own rows only)
                                       │
Supabase Cron (every minute) ──▶ Edge Function `notify` ──reads due events──▶ Postgres
                                       │  (service role, server-side only)
                                       └──Web Push (VAPID)──▶ FCM ──▶ phone
```

| Piece | Detail |
|---|---|
| `public/sw.js` | Service worker for **push only**: shows the notification, opens the page on tap. **No offline caching** (keeps RESPONSIVE §3 rule). |
| `push_subscriptions` table | `user_id`, endpoint, keys, created_at; RLS: a member manages only their own rows. RLS enabled in the same migration (KI-08 lesson). |
| `notification_log` table | Prevents duplicates (event key unique), e.g. `letter-unlock:<id>`, `monthsary:<n>`. Server-only (no client access). |
| Edge Function `notify` | Runs every minute: finds letters that became open since the last run and a monthsary that just began; sends pushes; records them in the log; removes dead subscriptions (HTTP 404/410). |
| Phase B trigger | Database webhook on publish → same function (or picked up by the minute run). |
| Keys | VAPID public key in the site (public by design); VAPID private key and service role key only as **Supabase function secrets**. |

## 6. Owner setup (one time, ~20 minutes, guided)

1. Generate VAPID keys in a codespace (`npx web-push generate-vapid-keys`).
2. Add 2 secrets in Supabase → Edge Functions → Secrets.
3. Deploy the function (Supabase dashboard editor or codespace CLI).
4. Run the migration and the cron schedule SQL.
5. Add `VITE_VAPID_PUBLIC_KEY` in Vercel and redeploy.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Free-tier Cron / Edge Function availability or limits change | Verify before build; fallback: GitHub Actions every 5 min (less punctual) |
| Phone battery savers delay delivery (Samsung especially) | Document "allow notifications / unrestricted battery" for Chrome; notification is a bonus, unlocking never depends on it |
| Notification permission denied | App keeps working; dots and "Waiting for you" remain |
| Launch timeline (≈3 weeks) | Phase A only before launch; Phase B after |

## 8. Effort and placement

About one build session plus ~20 minutes of owner setup. Proposed order:
**S5 Memories → CR-04 Phase A → S6 Ops → VALIDATE**. Phase B after launch.

## 9. Acceptance criteria (Phase A)

1. She can enable notifications from More → Notifications on Android Chrome.
2. A scheduled letter produces exactly one notification within 1 minute of unlocking, with generic text.
3. A monthsary produces exactly one notification per member at the anchor minute.
4. Tapping a notification opens the right page (sign-in still required).
5. No letter content, label or name appears in any notification.
6. Turning notifications off stops them on that phone.
