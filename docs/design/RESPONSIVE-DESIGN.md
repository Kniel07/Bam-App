# Responsive Design — Our Little Universe

| Field | Value |
|---|---|
| Status | **APPROVED by owner (DESIGN)** |
| Version | 0.1 |

Mobile-first: base styles target a 360–430 px Android phone (the partner's
primary device). Larger breakpoints add space and columns; they never add
features.

## 1. Breakpoints (Tailwind)

| Name | Min width | Typical device |
|---|---|---|
| base | 0 | Phones (design target 390 × 844; test 360 × 800) |
| `sm` | 480 px | Large phones landscape |
| `md` | 768 px | Tablets |
| `lg` | 1024 px | Laptops |
| `xl` | 1280 px | Desktops |

## 2. Layout per breakpoint

| Element | base | md | lg+ |
|---|---|---|---|
| Navigation | Bottom tab bar (fixed, 64 px + safe-area inset) | Bottom bar | Top bar; bottom bar removed |
| Page padding | 20 px | 32 px | auto margins, max-width container |
| Home | Single column | Counter card + corners in 2 columns | Counter card left (sticky), content right |
| Story timeline | Left rail line, items full-width | Same, wider polaroids | Centre line, items alternate left/right |
| Letters grid | 2 columns | 3 columns | 4 columns (max 1120 px) |
| Memories grid | 2 columns | 3 columns | 4 columns |
| Letter reading | Full-screen sheet | Centred paper, 600 px | Centred paper, 640 px over dimmed page |
| Memory detail | Full-bleed photo, swipe | Photo + side caption | Photo + side caption, arrow keys |
| Editors | Bottom sheet (max 92 vh) | Centred dialog 560 px | Centred dialog 560 px |
| FAB | Bottom-right, above nav | Same | Becomes a header button "+ Add" |

## 3. Mobile specifics (Android first)

- Respect `env(safe-area-inset-*)` (gesture navigation bars, notches).
- `viewport-fit=cover`; `100dvh` instead of `100vh` (Chrome Android address-bar resizing).
- Android hardware/gesture **back** closes the open sheet or reading view first (sheets push a history entry), then navigates back.
- File input `accept="image/*"` opens the Android photo picker; no forced camera capture.
- Tap targets ≥ 44 px, ≥ 8 px apart; no hover-only affordances.
- Pull-to-refresh: native browser behaviour left intact.
- Web app manifest (name, icons, cream theme colour) so "Add to Home screen" looks right; **no offline service-worker caching of personal content in R1** (avoids stale/locked content edge cases).

## 4. Desktop specifics

- Hover states: lift shadow on cards/polaroids/envelopes.
- Keyboard: Tab order follows visual order; Esc closes sheets; ←/→ in memory detail.
- Max text measure ~68 characters.

## 5. Performance budget

| Metric | Target (mid-range Android, 4G) |
|---|---|
| Initial JS (gzip) | ≤ 180 KB, with Motion split out (loaded on Letters/Home ceremony) |
| Fonts | ≤ 4 woff2 files preloaded (subset latin) |
| LCP | ≤ 2.5 s |
| Images | Thumbnails via the same compressed file with `loading="lazy"` + fixed aspect ratio (no layout shift) |
| CLS | ≤ 0.1 |

## 6. Test matrix (VALIDATE)

| Priority | Device / browser | Viewport |
|---|---|---|
| P1 | Partner's Android phone, Chrome | real device |
| P1 | Playwright, Pixel-class emulation (Chrome) | 412 × 915 |
| P2 | Samsung Internet (if partner's phone is a Samsung) | real device |
| P2 | Small Android | 360 × 800 |
| P2 | Desktop Chrome | 1440 × 900 |
| P3 | iPhone Safari (owner may use), desktop Safari/Firefox | — |
