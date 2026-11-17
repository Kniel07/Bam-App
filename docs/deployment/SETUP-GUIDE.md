# Setup Guide — Our Little Universe

| Field | Value |
|---|---|
| Audience | The owner, setting up accounts and services |
| Time | ~45 minutes per environment |
| Status | Living document (becomes part of DEPLOYMENT.md in the DOCUMENT phase) |

> **Privacy rules while following this guide**
> - Nothing you type into Supabase, Vercel or your local `.env.local` goes into git.
> - Never paste keys, passwords, your partner's key, or the filled-in provisioning SQL into chat, GitHub issues, or commits.
> - The **service role / secret key** stays on your own computer only.

You will set this up **twice** (TD-015):

| Environment | Supabase project | Used by | Data |
|---|---|---|---|
| **dev** | e.g. `olu-dev` | Vercel *Preview* deployments, testing | Fake/test content only |
| **prod** | e.g. `olu-prod` | Vercel *Production* (the real site) | Your real memories |

Do **dev** now. Repeat the same steps for **prod** around L-7.

---

## Part A: Supabase project

1. Go to supabase.com → **New project** (Free plan).
   - **Name:** non-identifying (e.g. `olu-dev`). Don't use either of your names.
   - **Database password:** generate a strong one and save it in your password manager. (It's needed later for backups.)
   - **Region:** the one closest to where you both live.
2. Wait until the project is ready (~2 minutes).

### A1. Lock down sign-ups (FR-AUTH-02)

**Authentication → Sign In / Providers**
- **Allow new users to sign up: OFF** ← most important switch.
- Email provider: **enabled** (needed for password sign-in).

**Authentication → URL Configuration** (fill in after Part C gives you the address)
- **Site URL:** `https://<your-project-name>.vercel.app`
- **Redirect URLs:** add `https://<your-project-name>.vercel.app/owner`

### A2. Apply the database migrations

**SQL Editor → New query.** For each file in `supabase/migrations/`, **in order**:

1. `0001_foundation.sql`
2. `0002_core.sql`
3. `0003_content.sql`
4. `0004_security_helpers.sql`
5. `0005_rls.sql`
6. `0006_rpc.sql`
7. `0007_storage.sql`
8. `0008_partner_letters.sql`
9. `0009_shared_story.sql`
10. `0010_notifications.sql`
11. `0011_nudges.sql`
12. `0012_test_notifications.sql`
13. `0013_activities.sql` (after it: **redeploy** the `notify` Edge Function one last time with the updated `supabase/functions/notify/index.ts`. From 0013 on, notification texts come from the database, so later files need no redeploy.)
14. `0014_question_and_reasons.sql` (no function redeploy needed)
15. `0015_memories_featured.sql` (no function redeploy needed)

Open the file on GitHub, copy all of it, paste it into a new query, click **Run**. Each should end with "Success. No rows returned." If one fails, **stop** and send me the error message (it contains no personal data).

> **"Potential issue detected… creates tables without enabling Row Level Security"** appears for `0002` and `0003`. Choose **Run and enable RLS**. RLS is switched on in `0005` anyway; this option simply closes the tables from the first second. Enabling it twice is harmless.

> **Run the files strictly in number order and never skip one.** Each file assumes all earlier ones are applied. If `0012` was applied while `0011` was skipped (symptom: *"claim failed: relation "public.nudges" does not exist"*), do **not** run `0011` on its own afterwards. Run `supabase/repairs/repair_0011_after_0012.sql` once instead.

> **"relation … already exists" (error 42P07)** means that file was already applied on an earlier run (the editor runs a whole file all-or-nothing, so nothing changed). Don't re-run it. Check which migrations are in place:
> ```sql
> select
>   to_regprocedure('public.is_letter_author(uuid)') is not null                                 as m0008,
>   to_regprocedure('public.can_write_story_folder(text)') is not null                           as m0009,
>   to_regclass('public.push_subscriptions') is not null                                         as m0010,
>   has_column_privilege('authenticated', 'public.push_subscriptions', 'endpoint', 'UPDATE')     as m0010_latest;
> ```
> All `true` = up to date. Run only the files whose column is `false`.

> **If you created your owner account before running the migrations**, run this once after `0007` so your account gets a profile row:
> ```sql
> insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
> ```

### A3. Create your owner account

**Authentication → Users → Add user → Create new user**
- Email: your real email
- Password: strong, saved in your password manager
- **Auto Confirm User: ON**

### A4. Verify (copy into the SQL editor and run)

```sql
-- Expect: 7 tables, all with rls_enabled = true
select tablename, rowsecurity as rls_enabled
  from pg_tables where schemaname = 'public' order by tablename;

-- Expect: one private bucket named media
select id, public from storage.buckets;

-- Expect: 0 (no partner yet). An error here means session revocation
-- needs a permission fix: send me the error text.
select public.revoke_partner_sessions();
```

---

## Part B: Your computer (one time)

Requirements: Node.js 20+ and git.

```bash
git clone https://github.com/Kniel07/Bam-App.git
```

```bash
cd Bam-App
```

```bash
git checkout claude/sleepy-babbage-5rohvx
```

```bash
npm ci
```

Create a file named **`.env.local`** in the project folder (it's gitignored). Values are in **Supabase → Project Settings → API Keys**:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>   # NEVER share or upload
APP_URL=https://<your-project-name>.vercel.app
```

Try it locally:

```bash
npm run dev
```

Open the printed address followed by `/owner` and sign in with your owner account. You'll see "Our universe isn't set up yet". That's expected until Part D.

---

## Part C: Vercel

1. vercel.com → **Add New → Project** → import `Kniel07/Bam-App`.
2. **Project name:** this becomes the address `<name>.vercel.app` and is **printed on the QR card**, so choose carefully and don't change it later (TD-017). No personal names.
3. Framework preset: **Vite** (detected automatically). Build command `npm run build`, output `dist`.
4. **Environment Variables** (Settings → Environment Variables):

   | Name | Value now (dev project) | At L-7 (switch to prod project) |
   |---|---|---|
   | `VITE_SUPABASE_URL` | dev Project URL, e.g. `https://<ref>.supabase.co` (no trailing `/`, no `/rest/v1`) | prod Project URL |
   | `VITE_SUPABASE_ANON_KEY` | dev anon / publishable key | prod anon / publishable key |

   - Tick **Production, Preview and Development** for both. While the repository has only one branch, Vercel builds it as **Production**, so Production needs values from day one. They point at the dev project until you switch at L-7.
   - Names must match exactly (they must start with `VITE_`). Paste values without quotes.
   - **Never** add the service role / secret key to Vercel.
5. **Redeploy after any variable change:** Deployments → latest → ⋯ → **Redeploy**. Vite bakes these values into the site at build time, so a variable added after a build has no effect until the next build. Symptom if missing: the page says *"The app is not configured yet (missing Supabase settings)."*
6. Go back to **A1** and fill in the Site URL / Redirect URLs.

---

## Part D: Provision the relationship and her account

1. On your computer, create her account and a **test** QR code:

   ```bash
   npm run partner-key -- create
   ```

   This creates her account under the synthetic address `partner@our-little-universe.example.com` (TD-018) and saves a QR image in the `private/` folder (gitignored). For **dev** this QR is for testing only.

2. Open `supabase/provisioning.example.sql`, copy it into the **SQL editor** (not into a file in the repo), replace each `<PLACEHOLDER>`:
   - `<YYYY-MM-DD HH:MM:SS>`: your anchor moment, local time
   - `<IANA_TIMEZONE>`: your timezone in `Region/City` form
   - `<COUNTER_MESSAGE>`: the line under the counter (editable later in Settings)
   - `<OWNER_EMAIL>`: your owner email
   - `<PARTNER_LOGIN_ADDRESS>`: `partner@our-little-universe.example.com`

   Run it. The last query should list exactly two rows: `owner` and `partner`.

3. Reload the site, sign in at `/owner`: the counter appears. Open **More → Settings** to set names and words.

4. Test her experience on a **different browser or phone**: scan the test QR from `private/`. You should land on Home (and see the welcome envelope if you wrote a welcome letter).
   Preview deployments sit behind Vercel's login, so sign in to Vercel once on that test browser first. (Production has no Vercel login; the app's own protection applies.)

---

## Part E: Before launch (prod)

- Set up the **prod** project: either repeat Parts A and D, or (recommended) do Part A1 + A2 only and fill it with the restore drill (Part G4), which also brings your real content and both accounts over from dev. Then replace both Vercel variables with the prod values and **Redeploy** (Part C, steps 4–5), redo Part F for prod, and point the Part G secrets at prod.
- Around **L-2**, run `npm run partner-key -- rotate` on prod to issue the **final** key, then print that QR. Any earlier test cards stop working.
- After launch, switch the GitHub repository to **private** (TD-016).

---

## Part F: Phone notifications (CR-04, one time per environment)

Needs migration `0010_notifications.sql` applied first.

1. **Create the notification keys** in a fresh codespace (see Part D for opening one):
   ```bash
   npx web-push generate-vapid-keys
   ```
   It prints a **Public Key** and a **Private Key**. Keep this terminal open.
2. **Supabase → Edge Functions → Secrets → Add new secret**, three times:

   | Name | Value |
   |---|---|
   | `VAPID_PUBLIC_KEY` | the Public Key |
   | `VAPID_PRIVATE_KEY` | the Private Key (**never** paste this anywhere else) |
   | `VAPID_SUBJECT` | `https://<your-project-name>.vercel.app` |

3. **Deploy the function:** Supabase → Edge Functions → **Deploy a new function → Via Editor**. Name it `notify`, paste the contents of `supabase/functions/notify/index.ts`, deploy. Then open its **Settings** (Details tab) and turn **"Verify JWT" / "Enforce JWT verification" OFF**, then save.
4. **Schedule it:** SQL Editor → paste `supabase/notifications.cron.example.sql`, replace `<PROJECT_REF>`, run. The last query should show `notify-every-minute | * * * * * | true`.
5. **Vercel → Settings → Environment Variables:** add `VITE_VAPID_PUBLIC_KEY` = the **Public** Key (all environments), then **Redeploy**.
6. **Delete the codespace.**
7. **On each phone:** open the site in **Chrome** → More → **Notifications & app** → **Install the app**, then open the installed app → More → Notifications & app → **Turn on notifications** → Allow.
8. **Test:** write a letter for the other person, set to unlock in ~3 minutes, publish. Their phone should get *"A letter just unlocked for you 💌"* within about a minute of the unlock time, even with the app closed.

### Troubleshooting: notifications don't arrive

1. On the phone: installed app → More → **Notifications & app** → turn notifications **off and on** once → **Send me a test notification**. The message under the button names the broken link (keys mismatch, phone not registered, missing secret…).
2. If it's still unclear, run this in the SQL editor and send the result (it contains counts and status codes only, no keys):

```sql
select
  (select count(*) from cron.job where jobname = 'notify-every-minute' and active)              as cron_active,
  (select json_agg(d) from (select status, left(return_message, 120) as msg, start_time
                              from cron.job_run_details order by start_time desc limit 3) d)   as cron_runs,
  (select json_agg(r) from (select status_code, left(content::text, 200) as body, created
                              from net._http_response order by created desc limit 3) r)        as function_calls,
  (select json_agg(json_build_object('role', m.role,
          'devices', (select count(*) from public.push_subscriptions s where s.user_id = m.user_id)))
     from public.relationship_members m)                                                        as devices,
  (select count(*) from public.notification_log where claimed_at > now() - interval '1 day')    as events_last_day;
```

| What you see | Meaning | Fix |
|---|---|---|
| error `schema "cron" does not exist` / `cron_active = 0` | Scheduler not set up | Part F step 4 |
| `function_calls` status `401` | "Verify JWT" still on | Turn it off on the `notify` function |
| status `404` | Function missing or misnamed | Deploy it with the name `notify` |
| status `500`, body has `reason` | e.g. `Missing secret VAPID_SUBJECT` | Add that secret (Part F step 2) |
| body `failedStatuses: [403]` | Public key in Vercel ≠ `VAPID_PUBLIC_KEY` | Use one key pair everywhere, redeploy Vercel, re-enable on phones |
| `devices` 0 for a person | That phone never subscribed | Turn notifications on in the app |
| everything fine, still nothing | Phone-side blocking | Notifications allowed, battery Unrestricted, DND off |

> Samsung / battery savers: if notifications arrive late, set **Settings → Apps → Chrome (and the installed app) → Battery → Unrestricted**. Letters still unlock on time either way.

---

## Part G: Keep-alive, backups and the restore drill (S6, one time)

Supabase's free plan **pauses a project after a week without visits** and offers
**no downloadable backups**. Two GitHub jobs cover this (TD-012/013/020):

| Job | When | What |
|---|---|---|
| **Keep-alive** | every 3 days | Pings the database so it never pauses |
| **Backup** | every Saturday + on demand | Copies all rows, both accounts and every photo, **encrypts** them, keeps 30 days of copies in GitHub |

GitHub emails you if either job fails. Until you finish G1–G3 they will fail, so expect those emails.

All secrets below go into **GitHub → the repository → Settings → Secrets and variables → Actions → New repository secret**. Secrets stay hidden: GitHub never shows them in logs or to visitors, even while the repository is public. Use the project the real app uses (today: the one your Vercel production points at).

### G1. Keep-alive (5 minutes)

| Secret | Value |
|---|---|
| `KEEPALIVE_URL` | Project URL, e.g. `https://<ref>.supabase.co` |
| `KEEPALIVE_ANON_KEY` | the **anon / publishable** key (the same one Vercel has) |

Then **Actions → Keep-alive → Run workflow**. It should turn green within a minute.

### G2. Your backup key (10 minutes, in a fresh codespace)

Backups are locked with a key pair: GitHub gets the **public** half (can only lock), you keep the **private** half (can unlock). Even if someone downloaded a backup, it's unreadable without your private key.

```bash
sudo apt-get update && sudo apt-get install -y age
```

```bash
age-keygen -o backup-key.txt && cat backup-key.txt
```

It prints three lines. Copy **all three** into your password manager as a secure note named e.g. "Universe backup key". The line `# public key: age1…` holds the public half; the line starting `AGE-SECRET-KEY-` is the private half.

> **If you lose the private key, every backup becomes useless.** Keep it in the password manager. Never paste it into GitHub, Vercel, Supabase or chat.

Delete the file and the codespace afterwards (`rm backup-key.txt`).

### G3. Backup secrets (10 minutes)

| Secret | Value |
|---|---|
| `BACKUP_AGE_RECIPIENT` | the **public** key only: `age1…` (no `# public key:` prefix) |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service role / secret** key |
| `SUPABASE_DB_URL` | Supabase → **Connect** → **Session pooler** → copy the URI and put your database password in place of `[YOUR-PASSWORD]` |

- Use the **Session pooler** address (it ends in `pooler.supabase.com:5432`). The "Direct connection" doesn't work from GitHub.
- If your database password contains special characters (`@ : / ? # %`), it must be URL-encoded inside the URI. If in doubt, reset the database password (Project Settings → Database) to one with letters and digits only, and update your password manager.
- This is the only place outside your own computer where the secret key lives (approved in ARCHITECTURE §5).

Then **Actions → Backup → Run workflow**. When it's green, the run page shows an artifact `olu-backup-<number>` (one `.tar.age` file). The log shows only counts, never content.

### G4. Restore drill (about 30 minutes, required before launch)

A backup only counts once it has been restored. Do this once before launch, then every 3 months.

1. **An empty Supabase project.** The free plan allows two projects. Use the **prod** project you create for Part E (recommended: the drill then also moves your real data into prod), or a scratch project you delete afterwards. Don't create your owner account in it (skip A3) or provision it (skip D): the restore brings both accounts. Do set A1 (sign-ups off, Site URL).
2. **Download the backup:** GitHub → Actions → Backup → the latest green run → artifact `olu-backup-<number>` → unzip, so you have `olu-backup-….tar.age`.
3. **Open a fresh codespace** and drag the `.tar.age` file into it. Install the tools (psql must be version 17):
   ```bash
   sudo apt-get update && sudo apt-get install -y age postgresql-common && sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y && sudo apt-get install -y postgresql-client-17 && npm ci
   ```
4. **Put your private key in a file:**
   ```bash
   mkdir -p private && nano private/backup-key.txt
   ```
   Paste the three lines from your password manager, save (Ctrl+O, Enter, Ctrl+X). `private/` is never committed.
5. **Point at the empty project** (values from the *target* project: Session pooler URI with its password, Project URL, secret key):
   ```bash
   export TARGET_DB_URL='<session pooler URI>' TARGET_SUPABASE_URL='https://<ref>.supabase.co' TARGET_SERVICE_ROLE_KEY='<secret key>'
   ```
6. **Restore:**
   ```bash
   bash scripts/backup/restore.sh olu-backup-*.tar.age private/backup-key.txt
   ```
   It applies the migrations, loads both accounts and every row, uploads the photos, and ends with **"Row counts match"**. It refuses to run against a project that already has accounts or a relationship.
7. **Spot-check** by running the app against the restored project in the codespace:
   ```bash
   printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\n' "$TARGET_SUPABASE_URL" '<target anon key>' > .env.local && npm run dev
   ```
   Open the forwarded address → `/owner` → sign in with **your usual password**. Check: counter correct, a letter you wrote opens, a memory photo loads, the Story timeline is complete. Her current QR key works on the restored project too.
8. **Clean up:** `rm private/backup-key.txt .env.local`, delete the codespace, and delete the scratch project if you used one. Tell me "restore drill passed" (or the last lines of the output if it failed).

**Not inside a backup** (redo on a new project): Auth settings (A1), the `notify` function, its secrets and schedule (Part F), and the Vercel variables (Part C).

### G5. Monthly 2-minute check

- GitHub → Actions: Keep-alive and Backup show recent green runs.
- GitHub disables scheduled jobs in a **public** repository after 60 days without commits. If a job shows "disabled", click **Enable workflow**. (After the repository goes private this stops happening.)
- If Supabase ever says the project is **paused**: Dashboard → the project → **Restore project** (free; data is kept), then run Keep-alive once.

## What to send me (safe to share)

- "Done with Part X" messages.
- Error messages from the SQL editor or the terminal (check that they don't contain keys first).
- Never: keys, passwords, the QR image or its link, or the filled-in provisioning SQL.
