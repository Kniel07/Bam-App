# Page Structure — Our Little Universe

| Field | Value |
|---|---|
| Status | **APPROVED by owner (DESIGN)** |
| Version | 0.1 |

Covers information architecture, routes, navigation, and a text wireframe
for every R1 page including its loading, empty and error states.
Wireframes are mobile-first (360–430 px). Desktop adaptations are in
[RESPONSIVE-DESIGN](./RESPONSIVE-DESIGN.md).

---

## 1. Information architecture

```
Our Little Universe
├── (no session) ─── Locked screen            /
│                └── Key landing (QR)         /key#<secret>
│                └── Owner sign-in            /owner
│
└── (member session)
    ├── Home: "Our Universe"                  /
    │     counter · next monthsary · waiting-for-you · corners
    ├── Our Story                             /story
    ├── Letters                               /letters
    │     └── Letter reading view             /letters/:letterId
    ├── Memories                              /memories
    │     ├── Memory detail                   /memories/:memoryId
    │     └── Add / edit memory (sheet)       /memories/new · /memories/:id/edit
    ├── Reasons (R1 stretch)                  /reasons
    └── Settings (owner only)                 /settings
```

R2 adds `/surprises`, `/playlist` and consolidated settings tabs.
R3 adds easter eggs (no routes; embedded in existing pages).

**Why this structure:** the Home page is the "heart" of the universe and
answers her first question on every visit ("what's new for me?"). Each module
is one level deep, so nothing is more than two taps away.

## 2. Routing & access rules

| Route | Who | Behaviour without access |
|---|---|---|
| `/key` | anyone | Handles the QR key, then redirects to `/` |
| `/owner` | anyone | Owner email + password form; not linked anywhere in the partner UI |
| `/` and all module routes | members | No session → Locked screen (same URL, so no route names leak) |
| `/settings` | owner | Partner → redirected to `/` (and RLS rejects writes regardless) |
| Unknown route | members | Friendly 404 ("This corner of the universe doesn't exist") with link home |

Refresh on any route works (Vercel SPA rewrite to `index.html`).

## 3. Navigation

**Mobile: bottom tab bar** (thumb reach on Android; 5 slots max).

| Slot | Icon (Lucide) | Label | Route |
|---|---|---|---|
| 1 | `house` → custom heart-house | Home | `/` |
| 2 | `book-heart` | Story | `/story` |
| 3 | `mail` | Letters | `/letters` (badge dot when an unlocked letter is unread) |
| 4 | `images` | Memories | `/memories` |
| 5 | `sparkles` | More | Sheet: Reasons (if shipped), Settings (owner), Preview-as-partner (owner), Sign out |

**Desktop (≥ 1024 px): top bar**: wordmark left, the same items as text
links centre, "More" menu right.

Owner-only elements are rendered only for the owner (and are, in any case,
protected by RLS).

---

## 4. Wireframes (R1)

Legend: `[ ]` button · `( )` chip · `▢` image · `✉` envelope · `✦` sparkle ·
`···` text placeholder

### 4.1 Locked screen (no session)

```
┌──────────────────────────────┐
│                              │
│            ✦                 │
│        ( wax seal )          │
│                              │
│  This little universe        │
│  is private.                 │
│                              │
│  Scan your key to come in.   │
│                              │
│                              │
│  (no names, no dates,        │
│   no links)                  │
└──────────────────────────────┘
```
Reasoning: reveals nothing about who it belongs to; stays beautiful in case
she lands here (e.g. a different browser).

### 4.2 Key landing `/key#…`

```
┌──────────────────────────────┐
│                              │
│        ♡  (gentle pulse)     │
│  Opening our little          │
│  universe…                   │
│                              │
└──────────────────────────────┘
 success → replace URL (drops #key) → Home (first visit: Welcome envelope)
 failure → "This key doesn't open the door anymore. Ask for a new one."
```

### 4.3 Owner sign-in `/owner`

Simple card: email, password, `[Sign in]`, "Forgot password?" link. Same
visual language; no partner-facing copy.

### 4.4 Home: "Our Universe" `/`

```
┌──────────────────────────────┐
│ Our Little Universe     ✦    │  ← wordmark (Fraunces)
│                              │
│ ╭──────────────────────────╮ │
│ │  TOGETHER FOR            │ │  ← micro label
│ │  1 month · 6 days        │ │  ← display
│ │  ┌──┐ ┌──┐ ┌──┐ ┌──┐     │ │
│ │  │ 1│ │ 6│ │14│ │32│     │ │  ← months days hours minutes
│ │  └──┘ └──┘ └──┘ └──┘     │ │    (years tile appears once ≥ 1)
│ │  "Every day with you is  │ │  ← counter message (Caveat)
│ │   another favorite…"     │ │
│ ╰──────────────────────────╯ │
│                              │
│ ( ♡ Monthsary #2 · in 24 d ) │  ← next monthsary pill → countdown
│                              │
│ WAITING FOR YOU              │  ← only when there are unread unlocked letters
│ ✉ Open when you miss me  →   │
│                              │
│ CORNERS OF OUR UNIVERSE      │
│ ┌────────────┐┌────────────┐ │
│ │ Our Story  ││ Letters    │ │
│ │ ▢ (latest) ││ ✉✉ 3 new   │ │
│ └────────────┘└────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Memories  ▢▢▢ (stack)    │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  ⌂    📖    ✉    ▢    ✦      │  ← bottom nav
└──────────────────────────────┘
```

**Monthsary-day variant** (from the anchor minute until the end of that
calendar day in the relationship timezone): counter card gains a blush
background and heading "Happy 1st monthsary" (ordinal computed); floating
hearts play once; the monthsary letter, if any, is pinned at the top of
"Waiting for you".

**First visit (partner, once ever):** a single centred envelope "For you"
over a dimmed Home; tapping opens the owner's `welcome_message` using the
letter-opening sequence; closing reveals Home. Stored server-side
(`profiles.welcomed_at`) so it doesn't repeat on another device.

| State | Design |
|---|---|
| Loading | Counter card skeleton (blush shimmer); counter itself renders instantly from cached settings when available |
| Empty sections | Corners show inviting empty copy ("Our first memory is waiting") |
| Error | Inline card: "Something got lost in space. [Try again]" |

### 4.5 Our Story `/story`

```
┌──────────────────────────────┐
│ Our Story                    │
│ ╭──────────────────────────╮ │
│ │ intro story paragraph(s) │ │  ← letter-paper card
│ │ ···                      │ │
│ ╰──────────────────────────╯ │
│                              │
│ ●─ THE DAY IT ALL BEGAN      │  ← anchor marker, derived from settings,
│ │  (date, in Caveat)         │    always present → never empty
│ │                            │
│ ♡─ [highlighted milestone]   │  ← blush card, heart marker
│ │  Title                     │
│ │  caption ···               │
│ │   ▢ polaroid (tilted)      │
│ │                            │
│ ●─ Milestone                 │
│ │  ···                       │
│ ✦  "to be continued…"        │  ← end cap (Caveat)
│                     [ + ]    │  ← owner: add milestone (FAB)
└──────────────────────────────┘
```
Order: chronological (oldest first): it's a story. Owner sees a pencil on
each item and a "Draft" ribbon on drafts.

| State | Design |
|---|---|
| Loading | 3 skeleton milestone rows |
| Empty | Anchor marker + "Our story is just beginning…" |
| Error | Inline error card with retry |

### 4.6 Letters `/letters`

```
┌──────────────────────────────┐
│ Letters                      │
│ Little envelopes for little  │  ← subtitle (Caveat)
│ moments.                     │
│                              │
│ ┌────────────┐┌────────────┐ │
│ │    ✉       ││    ✉  🔒   │ │
│ │ Open when  ││ Open on our│ │
│ │ you miss me││ monthsary  │ │
│ │  ● new     ││ in 3 days  │ │
│ └────────────┘└────────────┘ │
│ ┌────────────┐┌────────────┐ │
│ │    ✉ ✓     ││    ✉       │ │
│ │ …you're sad││ …can't     │ │
│ │  opened    ││   sleep    │ │
│ └────────────┘└────────────┘ │
│                     [ + ]    │  ← owner: new letter
└──────────────────────────────┘
```
Sort: newly unlocked & unread first → available unopened → locked (soonest
first) → opened.

**Envelope states:** `sealed` (available, unopened) · `new` (just unlocked,
gentle glow + "new") · `locked` (scheduled future: muted, lock, countdown;
tap shows "Not yet… opens in 3 days") · `opened` (seal broken, ✓) ·
`draft` (owner only, dashed outline + "Draft").

**Opening interaction:** tap envelope → it lifts and centres, prompt "Tap
the seal to open" → tap seal → ceremony → reading view. Two deliberate taps
prevent accidental opening while scrolling and turn opening into a ritual.

### 4.7 Letter reading view `/letters/:letterId`

```
┌──────────────────────────────┐
│ [×]                          │
│ ╭──────────────────────────╮ │
│ │ Open when you miss me    │ │  ← Caveat label
│ │                          │ │
│ │ body text (letter style, │ │
│ │ 18px, 1.75 line height)  │ │
│ │ ···                      │ │
│ │                          │ │
│ │        — signature       │ │  ← Caveat, owner display name
│ │   ▢ polaroid (optional)  │ │
│ ╰──────────────────────────╯ │
│  opened on <date>            │  ← small, ink-soft
└──────────────────────────────┘
```
Direct navigation to a locked letter's URL shows the locked envelope with
its countdown. The content request is refused by the database, never just
hidden.

### 4.8 Memories `/memories`

```
┌──────────────────────────────┐
│ Our Memories                 │
│ ┌──────────┐ ┌──────────┐    │
│ │▢▢▢▢▢▢▢▢▢▢│ │▢▢▢▢▢▢▢▢▢▢│    │ ← polaroids, 2 columns,
│ │▢▢▢▢▢▢▢▢▢▢│ │▢▢▢▢▢▢▢▢▢▢│    │   deterministic tilt,
│ │ caption  │ │ caption  │    │   washi tape on top
│ │ date     │ │ date     │    │
│ └──────────┘ └──────────┘    │
│ ┌──────────┐ ┌──────────┐    │
│ │   ···    │ │   ···    │    │
│                     [ + ]    │ ← both users: add memory
└──────────────────────────────┘
```
Sort: newest `taken_on` first (a scrapbook you flip back through). Infinite
scroll in pages of 24 (not needed early, but cheap to do right).

### 4.9 Memory detail `/memories/:memoryId`

Full-bleed photo on a cream backdrop, caption (Caveat), date, "added by
<name>", prev/next arrows (swipe on touch), and `[Edit] [Delete]` when the
viewer may (own memory, or owner).

### 4.10 Add / edit memory (bottom sheet)

```
┌──────────────────────────────┐
│ ─── (grabber)                │
│ New memory                   │
│ ┌──────────────────────────┐ │
│ │   ▢  tap to choose photo │ │  ← preview as polaroid once chosen
│ └──────────────────────────┘ │
│ Caption  [________________]  │
│ Date     [ today        ▾]   │
│                              │
│ [ Cancel ]   [ Save memory ] │
└──────────────────────────────┘
 Saving → progress on the polaroid: "Tucking your photo into the scrapbook…"
```

### 4.11 Reasons `/reasons` (R1 stretch)

A single large card "Reason #007" with the reason in `hand-lg`; `[Another
reason]` flips to a random unseen one; "See all" lists them numbered.

### 4.12 Settings `/settings` (owner)

Sections as stacked cards:
1. **Our beginning**: start date, start time, timezone (searchable select).
   Live preview: "Next monthsary: #2 on <date> at <time>".
2. **Names**: owner display name, partner display name.
3. **Words**: counter message, welcome message, intro story.
4. **Partner key**: status ("Key active since <date>"), instructions for rotation (R1: local script; R2: button).

### 4.13 Owner tools overlay (all pages)

- Pencil icon on editable items; `[ + ]` FAB where creation is allowed.
- Editors open as bottom sheets (mobile) / centred dialogs (desktop).
- **Preview as partner** toggle in "More": hides owner controls and drafts,
  shows locked letters as locked, and shows an "Previewing as [partner]"
  banner with `[Exit preview]`.

### 4.14 Global states

| State | Pattern |
|---|---|
| Page loading | Skeletons shaped like the final content (never spinners on whole pages) |
| Action pending | Button shows inline spinner + disabled; optimistic UI for marks like read status |
| Offline | Slim top banner; cached content stays visible |
| Not found | Friendly 404 with home link |
| Fatal error | Error boundary page: "Something got lost in space" + reload |
| Toasts | Bottom, above nav, 3 s, for confirmations ("Memory saved") |
