/**
 * Web Push on this device (CR-04). The subscription is stored in
 * `push_subscriptions`, where RLS lets each member manage only their own devices.
 */
import { supabase } from '@/lib/supabase/client'

export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
const SERVICE_WORKER_URL = '/sw.js'

export type PushStatus =
  | 'unsupported' // this browser can't do Web Push
  | 'needs-install' // iPhone: only the Home Screen app can receive pushes
  | 'not-configured' // the site has no VAPID key yet
  | 'blocked' // permission denied in browser/OS settings
  | 'off'
  | 'on'

export class PushError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'PushError'
  }
}

/** Converts the base64url VAPID key to the byte array the Push API expects. */
export function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' })
  } catch {
    return null
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL)
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** Current state for this device, in order of what blocks first. */
export async function getPushStatus(): Promise<PushStatus> {
  if (isIos() && !isStandalone()) return 'needs-install'
  if (!isPushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  if (Notification.permission === 'denied') return 'blocked'
  const subscription = await currentSubscription()
  return subscription && Notification.permission === 'granted' ? 'on' : 'off'
}

/** Asks for permission, subscribes this device, and saves it for the signed-in member. */
export async function enablePush(): Promise<PushStatus> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready)
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) throw new PushError('The browser returned an incomplete subscription')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, p256dh, auth }, { onConflict: 'endpoint' })
  if (error) {
    await subscription.unsubscribe()
    throw new PushError('Could not save this device', error)
  }
  return 'on'
}

/** Unsubscribes this device and forgets it on the server. */
export async function disablePush(): Promise<PushStatus> {
  const subscription = await currentSubscription()
  if (subscription) {
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    if (error) throw new PushError('Could not turn notifications off', error)
    await subscription.unsubscribe()
  }
  return 'off'
}
