/**
 * Android back button closes open sheets (COMPONENT-SPECIFICATION §1, KI-05).
 *
 * Each open sheet owns one browser history entry (same URL, marked in
 * `history.state`). Pressing back pops that entry and closes the top sheet
 * instead of leaving the page. When a sheet closes any other way (X, Esc,
 * backdrop, app logic), its entry is removed again so back keeps working
 * normally afterwards.
 *
 * History changes are reconciled once per microtask, so a sheet that closes
 * while another opens in the same render (stacked sheets) causes no history
 * churn at all.
 */

const DEPTH_KEY = '__sheetDepth'

interface Entry {
  onBack: () => void
}

const stack: Entry[] = []
/** How many sheet entries we currently have on top of the history stack. */
let depth = 0
let isSyncScheduled = false
let isListening = false
/** Tells us when the router is mid-navigation (set once by the app). */
let isNavigationPending: () => boolean = () => false

/**
 * A link inside a sheet both closes the sheet and starts a navigation. Rewinding
 * the sheet's entry then would race the router and undo the navigation, so the
 * app reports pending navigations here and we leave history alone instead.
 */
export function setNavigationPendingProbe(probe: () => boolean) {
  isNavigationPending = probe
}

function stateDepth(state: unknown): number {
  if (state && typeof state === 'object' && DEPTH_KEY in state) {
    const value = (state as Record<string, unknown>)[DEPTH_KEY]
    return typeof value === 'number' ? value : 0
  }
  return 0
}

function onPopState(event: PopStateEvent) {
  const reached = stateDepth(event.state)
  if (reached >= depth) {
    // Our own history.go() landing, or forward navigation: nothing to close.
    depth = Math.min(reached, stack.length)
    return
  }
  // The user went back past one (or more) sheet entries: close those sheets.
  const closing = depth - reached
  depth = reached
  for (const entry of stack.slice(-closing).reverse()) entry.onBack()
}

function sync() {
  isSyncScheduled = false
  const wanted = stack.length
  if (wanted > depth) {
    for (let level = depth + 1; level <= wanted; level += 1) {
      // Keep the router's own state (key, idx) so it treats this as the same page.
      const base = (window.history.state ?? {}) as Record<string, unknown>
      window.history.pushState({ ...base, [DEPTH_KEY]: level }, '')
    }
    depth = wanted
  } else if (wanted < depth) {
    // Only rewind entries that are still ours and on top. If the user navigated
    // from inside a sheet, the new page is (or is about to be) on top: leave
    // history alone. Cost: one extra back press later lands on the same page.
    if (stateDepth(window.history.state) === depth && !isNavigationPending()) {
      const steps = depth - wanted
      depth = wanted
      window.history.go(-steps)
    } else {
      depth = wanted
    }
  }
}

function scheduleSync() {
  if (isSyncScheduled) return
  isSyncScheduled = true
  queueMicrotask(sync)
}

/** Registers an open sheet. Returns the function to call when it closes. */
export function pushBackHandler(onBack: () => void): () => void {
  if (!isListening) {
    window.addEventListener('popstate', onPopState)
    isListening = true
  }
  const entry: Entry = { onBack }
  stack.push(entry)
  scheduleSync()
  return () => {
    const index = stack.indexOf(entry)
    if (index === -1) return
    stack.splice(index, 1)
    scheduleSync()
  }
}

/** Test helper: forget all state between tests. */
export function resetBackStackForTests() {
  stack.length = 0
  depth = 0
  isSyncScheduled = false
}
