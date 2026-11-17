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

Open the file on GitHub, copy all of it, paste it into a new query, click **Run**. Each should end with "Success. No rows returned." If one fails, **stop** and send me the error message (it contains no personal data).

> **"Potential issue detected… creates tables without enabling Row Level Security"** appears for `0002` and `0003`. Choose **Run and enable RLS**. RLS is switched on in `0005` anyway; this option simply closes the tables from the first second. Enabling it twice is harmless.

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

- Repeat Parts A and D against the **prod** project, then replace both Vercel variables with the prod values and **Redeploy** (Part C, steps 4–5).
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

> Samsung / battery savers: if notifications arrive late, set **Settings → Apps → Chrome (and the installed app) → Battery → Unrestricted**. Letters still unlock on time either way.

## What to send me (safe to share)

- "Done with Part X" messages.
- Error messages from the SQL editor or the terminal (check that they don't contain keys first).
- Never: keys, passwords, the QR image or its link, or the filled-in provisioning SQL.
