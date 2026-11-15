# Component Specification — Our Little Universe

| Field | Value |
|---|---|
| Status | **APPROVED by owner (DESIGN)** |
| Version | 0.1 |

Three layers, from generic to specific:

```
components/ui        → generic, no domain knowledge (Button, Card, Sheet…)
components/shared    → romantic visual primitives reused across features (Polaroid, Envelope, WaxSeal…)
features/<module>    → domain components composed from the above (LetterGrid, StoryTimeline…)
```

**Rules:** UI and shared components are presentational (props in, events
out; no data fetching). Feature components get data from feature hooks
(`useLetters()`, …). Business logic (dates, unlock state, permissions
display) lives in `lib/` or feature `logic.ts` files, never inside JSX.

---

## 1. `components/ui`

| Component | Props (key) | Variants / states | Notes |
|---|---|---|---|
| `Button` | `variant`, `size`, `isLoading`, `iconLeft` | `primary` (rose-deep fill, white text) · `secondary` (surface, rose-deep text, line border) · `ghost` · `danger`; `sm`/`md`; disabled, loading | Min height 44 px; radius-md; press = scale 0.98 |
| `IconButton` | `label` (required, a11y), `icon` | default, active | 44×44 hit area |
| `Fab` | `label`, `icon`, `onClick` | — | Bottom-right above nav, rose-deep, radius-full |
| `Card` | `tone` | `surface` · `blush` · `lavender` | radius-md, shadow-soft |
| `Sheet` | `isOpen`, `onClose`, `title` | — | Bottom sheet on mobile, dialog ≥ 768 px; focus trap; Esc/back closes; Android back button closes sheet (history entry) |
| `ConfirmDialog` | `title`, `message`, `confirmLabel`, `tone` | default, danger | — |
| `TextField` | `label`, `error`, `hint` | default, focus (rose-deep ring), error | Labels always visible (no placeholder-only) |
| `TextArea` | as above + `rows`, `autoGrow` | — | Used for letter body |
| `DateTimeField` | `value`, `timezone` | date, datetime | Native inputs (best on Android); displays timezone label |
| `Select` / `TimezoneSelect` | `options`, searchable | — | Timezone list from `Intl.supportedValuesOf('timeZone')` |
| `Toggle` | `checked`, `label` | — | For highlight / published |
| `Skeleton` | `shape` | rect, text, circle, polaroid | Static under reduced motion |
| `EmptyState` | `illustration`, `title`, `message`, `action` | — | Caveat title |
| `ErrorState` | `message`, `onRetry` | inline, page | Uses copy file |
| `Toast` / `useToast` | `message`, `tone` | info, success, error | Polite live region |
| `Badge` | `tone` | dot, label | "new", "Draft" |
| `Banner` | `tone`, `action` | offline, preview-mode | Top of page |

## 2. `components/navigation`

| Component | Responsibility |
|---|---|
| `BottomNav` | Mobile tab bar (5 slots), active state = rose-deep icon + label, unread dot on Letters |
| `TopNav` | Desktop bar with wordmark + links |
| `MoreSheet` | Reasons (if enabled), Settings (owner), Preview-as-partner (owner), Sign out |
| `PageHeader` | Title (h1), optional handwritten subtitle, optional right action |

## 3. `components/shared` (romantic primitives)

| Component | Props | Spec |
|---|---|---|
| `Polaroid` | `src`, `alt`, `caption`, `tiltSeed`, `size`, `withTape` | White surface, 10 px side/top border, 36 px bottom with caption in `hand`; radius-paper; shadow-lift; tilt −2°…+2° from `tiltSeed` (DS-06); lazy image with blush placeholder |
| `Envelope` | `label`, `state`, `unlockAt`, `onSelect` | Petal body, surface flap, `WaxSeal`; states sealed/new/locked/opened/draft (see PAGE-STRUCTURE §4.6); label in `hand-lg` |
| `EnvelopeOpening` | `letter`, `onOpened`, `onCancel` | Orchestrates lift → seal → flap → paper → reading view (Motion, lazy); tap anywhere to skip; reduced-motion = fade |
| `LetterPaper` | `label`, `body`, `signature`, `photo` | surface paper, radius-paper, `letter` typography, preserves paragraphs/line breaks; **renders text only** (no HTML injection) |
| `WaxSeal` | `size`, `broken` | rose-deep circle with embossed heart |
| `Sparkle` | `size`, `tone` | Decorative, `aria-hidden` |
| `FloatingHearts` | `play`, `count` | Max 8, CSS keyframes, plays once, static under reduced motion, `aria-hidden` |
| `CountdownText` | `target`, `serverOffsetMs` | "in 3 days" / "in 4 h 12 m" / "any moment now"; triggers `onReached` |
| `OwnerOnly` | `children` | Renders children only for owner and not in preview mode (UX only, not security) |
| `DraftRibbon` | — | Diagonal "Draft" corner label (owner view) |
| `SignedImage` | `path`, `alt`, … | Resolves storage path → cached signed URL (via `useSignedUrl`), handles loading/error |

## 4. Feature components

### auth
`KeyLanding` (reads fragment, signs in, replaces URL) · `OwnerSignInForm` ·
`LockedScreen` · `RequireMember` (route guard) · `RequireOwner` (route guard) ·
`WelcomeEnvelope`.

### monthsary
`MonthsaryCounter` (props: `startAt`, `timezone`, `message`; ticks every
minute aligned to the minute boundary; years tile hidden while 0) ·
`NextMonthsaryPill` · `MonthsaryCelebration` (day variant + hearts).

### home
`HomePage` · `WaitingForYou` (unread unlocked letters) · `CornerCard`.

### story
`StoryPage` · `StoryIntro` · `StoryTimeline` · `StoryAnchorMarker` ·
`MilestoneItem` · `MilestoneEditorSheet`.

### letters
`LettersPage` · `LetterGrid` · `LetterReadingPage` · `LetterEditorSheet`.

### memories
`MemoriesPage` · `MemoryGrid` · `MemoryDetailPage` · `MemoryEditorSheet` ·
`PhotoPicker` (validation + preview).

### reasons (stretch)
`ReasonsPage` · `ReasonCard` · `ReasonEditorSheet`.

### settings
`SettingsPage` · `BeginningForm` · `NamesForm` · `WordsForm` · `PartnerKeyInfo`.

### preview
`PreviewModeProvider` + `PreviewBanner`.

## 5. Hooks & logic (non-visual)

| Unit | Location | Responsibility |
|---|---|---|
| `calculateRelationshipDuration(startAt, now, timezone)` | `lib/dates/monthsary.ts` | DR-02 breakdown |
| `getMonthsary(startAt, n, timezone)` / `getNextMonthsary(startAt, now, timezone)` | `lib/dates/monthsary.ts` | DR-01 |
| `isMonthsaryDay(startAt, now, timezone)` | `lib/dates/monthsary.ts` | Day variant |
| `getLetterDisplayState(letter, now)` | `features/letters/logic.ts` | sealed/new/locked/opened/draft (display only; DB enforces) |
| `compressImage(file)` | `lib/media/compressImage.ts` | Canvas resize + encode, returns Blob |
| `useServerTimeOffset()` | `lib/time` | Calls `get_server_time()` once per session, exposes offset for countdowns |
| `useSession()`, `useRole()` | `features/auth` | Auth state + member role |
| `useSignedUrl(path)` | `lib/media` | Cached ~55 min (URL lifetime 60 min) |
| Feature data hooks | `features/*/hooks.ts` | TanStack Query wrappers around `features/*/api.ts` |

## 6. Accessibility contract (every component)

- Visible focus ring (2 px rose-deep, 2 px offset).
- Interactive elements ≥ 44×44 px.
- Icons-only controls have `aria-label`.
- Decorative SVGs `aria-hidden="true"`.
- Images: `alt` = caption (fallback "Memory photo").
- Sheets/dialogs trap focus, restore it on close.
- Countdown updates are not announced every minute (no live-region spam).
