import { useCallback, useEffect, useState } from 'react'
import { isIos, isStandalone } from './push'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

// Captured once at startup: Chrome fires this early, before any sheet is open.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    listeners.forEach((listener) => listener())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((listener) => listener())
  })
}

export type InstallState = 'installed' | 'available' | 'ios-manual' | 'unavailable'

function computeState(): InstallState {
  if (isStandalone()) return 'installed'
  if (deferredPrompt) return 'available'
  if (isIos()) return 'ios-manual'
  return 'unavailable'
}

/** "Install the app" support (CR-04 A-1): Android prompt, or iPhone instructions. */
export function useInstallPrompt() {
  const [state, setState] = useState<InstallState>(computeState)

  useEffect(() => {
    const update = () => setState(computeState())
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    setState(computeState())
  }, [])

  return { state, install }
}
