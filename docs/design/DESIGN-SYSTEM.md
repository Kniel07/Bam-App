# Design System — Our Little Universe

| Field | Value |
|---|---|
| Status | **APPROVED by owner (DESIGN)** |
| Version | 0.1 |
| Related | [PAGE-STRUCTURE](./PAGE-STRUCTURE.md) · [COMPONENT-SPECIFICATION](./COMPONENT-SPECIFICATION.md) · [RESPONSIVE-DESIGN](./RESPONSIVE-DESIGN.md) |

---

## 1. Design concept: "a scrapbook that lives in a small sky"

Two ideas, held in balance:

| Idea | Expressed through | Why |
|---|---|---|
| **Scrapbook / paper** | Cream paper backgrounds, polaroids, envelopes, wax seals, handwritten captions, slight tilts | Tactile and personal; signals "made by hand for you", not "software" |
| **Little universe** | A few tiny sparkle stars as a motif, the counter as the "heart" of the universe, sections as "corners" of it | Ties the product name to the visuals without space-theme clichés (no dark galaxy backgrounds) |

**Guiding principles**

1. **Emotion first, features second.** Every screen leads with a feeling (a message, a photo, an envelope) before any control.
2. **Quiet by default, delightful on purpose.** Motion and hearts are reserved for meaningful moments (opening a letter, monthsary day), never constant.
3. **Paper, not plastic.** Soft tinted shadows, warm neutrals, no glossy gradients, no pure white or pure black.
4. **Grown-up cute.** Pastel and handwritten accents, with editorial typography and generous whitespace. No cartoon mascots, no bubble fonts, no rainbow.
5. **Consistency over novelty.** One card style, one button style, one motion curve.

---

## 2. Color

Light theme only for R1 (see §9, decision DS-01).

### 2.1 Tokens

| Token | Hex | Role |
|---|---|---|
| `--color-cream` | `#FFF8F3` | Page background ("paper") |
| `--color-surface` | `#FFFDF9` | Cards, sheets, letter paper |
| `--color-blush` | `#FBE7EA` | Soft fills: highlighted milestones, chips, selected states |
| `--color-petal` | `#F3C9D2` | Decorative fills: envelope body, borders on highlight |
| `--color-rose` | `#E3A3B3` | **Decorative only** (hearts, seal glow, illustrations). Never for text |
| `--color-rose-deep` | `#9C4560` | Primary actions, links, wax seal, key headings accent |
| `--color-lavender-mist` | `#EEE9F8` | Secondary soft fill (memories/owner tools accents) |
| `--color-lavender-deep` | `#6E5C9A` | Secondary accent text/icons, owner-only UI accents |
| `--color-ink` | `#4A3B40` | Primary text (warm plum-brown, never pure black) |
| `--color-ink-soft` | `#735E64` | Secondary text, captions, metadata |
| `--color-line` | `#EFDCDD` | Hairlines, dividers, input borders |
| `--color-error` | `#B4473F` | Errors |
| `--color-success` | `#5E8C6A` | Success confirmations (sparingly) |

### 2.2 Verified contrast (WCAG 2.1)

| Pair | Ratio | Use allowed |
|---|---|---|
| ink on cream | 10.0 : 1 | All text |
| ink on surface | 10.4 : 1 | All text |
| ink-soft on cream | 5.7 : 1 | Body/secondary text |
| ink-soft on blush | 5.0 : 1 | Body/secondary text |
| rose-deep on cream | 5.8 : 1 | Links, buttons (outline), headings |
| rose-deep on blush | 5.2 : 1 | Text in chips/highlights |
| white on rose-deep | 6.1 : 1 | Primary button label |
| lavender-deep on cream | 5.5 : 1 | Secondary accents |
| error on cream | 5.1 : 1 | Error text |
| rose on cream | 2.0 : 1 | ❌ Decorative only |

### 2.3 Usage ratio

~70% cream/surface · ~20% blush/petal/lavender-mist · ~8% ink · ~2% rose-deep.
Rose-deep is precious: one primary action per screen.

### 2.4 Shadows (tinted, never grey)

| Token | Value | Use |
|---|---|---|
| `--shadow-soft` | `0 2px 8px rgb(156 69 96 / 0.08)` | Cards at rest |
| `--shadow-lift` | `0 8px 24px rgb(156 69 96 / 0.12)` | Hover/pressed-up, polaroids, envelopes |
| `--shadow-sheet` | `0 -8px 32px rgb(74 59 64 / 0.12)` | Bottom sheets |

### 2.5 Texture

A single, very subtle paper-grain noise (inline SVG, ~3% opacity) on the page
background only. No textures on cards (keeps text crisp).

---

## 3. Typography

All fonts are **self-hosted** via `@fontsource` packages. No Google Fonts
request, so the partner's IP never reaches a third party (NFR-06), and it
works offline once cached.

| Role | Family | Weights | Why |
|---|---|---|---|
| Display / headings | **Fraunces** (variable, "SOFT" axis ~50) | 400, 600 | Warm, soft serif with personality; editorial rather than childish |
| Body / UI | **Nunito Sans** | 400, 600, 700 | Rounded terminals echo the soft visual language; highly legible on small Android screens |
| Handwritten accent | **Caveat** | 500, 600 | Captions, envelope labels, signatures, counter message. Never for body paragraphs or anything that must be read quickly |

### 3.1 Type scale (mobile → desktop)

| Token | Mobile | ≥ 1024 px | Line height | Font | Use |
|---|---|---|---|---|---|
| `display` | 36 px | 48 px | 1.1 | Fraunces 600 | Home hero number, page titles on desktop |
| `h1` | 28 px | 36 px | 1.2 | Fraunces 600 | Page titles |
| `h2` | 22 px | 26 px | 1.25 | Fraunces 600 | Section/card titles |
| `h3` | 18 px | 20 px | 1.3 | Nunito Sans 700 | Sub-headings, milestone titles |
| `body` | 16 px | 17 px | 1.6 | Nunito Sans 400 | Paragraphs, forms |
| `letter` | 18 px | 19 px | 1.75 | Nunito Sans 400 | Letter reading view (longer reading) |
| `small` | 14 px | 14 px | 1.5 | Nunito Sans 400/600 | Metadata, captions |
| `micro` | 12 px | 12 px | 1.4 | Nunito Sans 700, +0.06em tracking, uppercase | Labels like "MONTHSARY #2", "DRAFT" |
| `hand-lg` | 28 px | 32 px | 1.2 | Caveat 600 | Envelope labels, counter message |
| `hand` | 20 px | 22 px | 1.3 | Caveat 500 | Polaroid captions, signatures |

Minimum text size: 14 px (12 px only for uppercase micro labels).

---

## 4. Spacing, layout, shape

### 4.1 Spacing scale (4 px base)

`space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 24 ·
`space-6` 32 · `space-7` 48 · `space-8` 64 · `space-9` 96.

Rules: page side padding 20 px mobile / 32 px tablet; vertical rhythm between
sections `space-7`; inside cards `space-4`/`space-5`.

### 4.2 Radius

| Token | Value | Use |
|---|---|---|
| `radius-paper` | 4 px | Polaroids, letter paper (real paper has near-square corners) |
| `radius-sm` | 10 px | Inputs, chips |
| `radius-md` | 18 px | Cards, buttons |
| `radius-lg` | 28 px | Bottom sheets (top corners), hero counter card |
| `radius-full` | 9999 px | Pills, avatar, FAB, wax seal |

### 4.3 Layout widths

Content max-width 680 px (reading comfort) except galleries (max 1120 px).

---

## 5. Iconography & decoration

- **Lucide** icons, 1.75 stroke, 20 px (inline) / 24 px (nav). Colour = current text colour.
- **Decorative motifs** (inline SVG components, drawn once, reused):
  - `Sparkle`: 4-point star, 8–14 px, rose or lavender, scattered sparingly (max 3 per view).
  - `Heart`: soft rounded heart for markers and floating hearts.
  - `WaxSeal`: circle with embossed heart, rose-deep.
  - `Washi`: translucent tape strip on top of polaroids (blush/lavender at 70% opacity).
- No emoji in UI chrome (emoji in owner-written content is fine).

---

## 6. Motion

Implementation: CSS transitions for simple state changes; **Motion** only for
orchestrated sequences (envelope open, reveal, shared-element zoom), lazy-loaded.

### 6.1 Tokens

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 150 ms | Press feedback, hover |
| `duration-base` | 250 ms | Sheets, fades, tab changes |
| `duration-slow` | 450 ms | Page-level reveals, polaroid zoom |
| `duration-ceremony` | 1100–1400 ms total | Envelope opening sequence, monthsary hearts |
| `ease-gentle` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for everything |
| `ease-paper` | spring: stiffness 220, damping 26 | Envelope flap, letter slide |

### 6.2 Moments that earn motion

| Moment | Motion | Frequency |
|---|---|---|
| Letter opening | Lift → seal breaks → flap opens → paper slides up and unfolds to full screen | Every open (skippable with a tap) |
| Monthsary day | 6–8 hearts float up from the counter once, then rest | Once per monthsary per device |
| Reason reveal (stretch) | Card flip | Each reveal |
| Polaroid → detail | Shared-element zoom | Each open |
| Counter minute tick | Number cross-fade | Each minute |
| Page change (tab or link) | `page-in`: fade + 6 px rise, 250 ms | Each navigation |
| Lists (envelopes, timeline, Home sections) | `rise-in`: 450 ms, staggered 45 ms per item (max 8 steps) | On page entry |
| Sheets and dialogs | `sheet-up` 300 ms on mobile, `dialog-pop` 250 ms on desktop, backdrop fade | Each open |
| Press feedback | Scale 0.97–0.98 on cards and envelopes; nav icons scale 0.9 on press and "pop" when selected | Each tap |
| Everything else | Simple fade/slide ≤ 250 ms | — |

**Never:** parallax, auto-playing carousels, continuous background animation,
bouncing elements, confetti storms.

### 6.3 Reduced motion

With `prefers-reduced-motion: reduce`: all animations collapse to ~1 ms with no delays (verified in Chromium); sequences become a quick
cross-fade; floating hearts render as a static cluster; skeleton shimmer is
replaced by a static fill.

---

## 7. Voice & microcopy

Warm, simple, second person, written as if the owner is speaking to her.
System copy never pretends to be personal content; personal lines come from
the database.

| Situation | Example copy (system, editable later) |
|---|---|
| Locked screen (no session) | "This little universe is private." / "Scan your key to come in." |
| Key no longer valid | "This key doesn't open the door anymore. Ask for a new one." |
| Scheduled letter locked | "Not yet… opens in 3 days" |
| Empty memories | "No memories here yet. Let's make the first one." |
| Generic error | "Something got lost in space. Try again?" |
| Offline | "You're offline. Some things may not load." |
| Upload in progress | "Tucking your photo into the scrapbook…" |

The final wording of every string lives in one copy file
(`src/lib/copy.ts`) so it can be refined without hunting through components.

---

## 8. Tailwind mapping

Tokens are defined once as CSS variables in `src/styles/index.css` and mapped
in Tailwind's theme (`colors.cream`, `colors.rose.deep`, `fontFamily.display`,
`boxShadow.soft`, …). Components use only token classes; **no raw hex values in
components**.

---

## 9. Design decisions

| ID | Decision | Reasoning | Alternative rejected |
|---|---|---|---|
| DS-01 | Light theme only (R1) | The cream/blush identity is the brand. A good dark theme is a second full palette and doubles visual QA. Revisit R3. | Auto dark mode (cost, risk of muddy pastels) |
| DS-02 | Self-hosted fonts | Privacy (no third-party requests), reliability | Google Fonts CDN |
| DS-03 | Three typefaces with strict roles | Handwriting adds intimacy; restricting it to short accents keeps readability | Handwriting for body text (illegible), one font (generic) |
| DS-04 | Tinted shadows, no gradients | Warm "paper" depth; complies with "avoid excessive gradients" | Glassmorphism, gradients |
| DS-05 | Motion only for ceremonies | Keeps delight meaningful and performance high | Ambient animation everywhere |
| DS-06 | Deterministic polaroid tilt (−2°…+2° derived from item id) | Hand-placed feel without layout jitter between renders | Random tilt each render |
