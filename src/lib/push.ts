import { pushSubscriptionsService } from '@/lib/db'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export type ResultadoAtivarPush = 'subscribed' | 'denied' | 'unsupported' | 'erro'

export async function ativarNotificacoesPush(uid: string): Promise<ResultadoAtivarPush> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) return 'erro'

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') return 'denied'

    const existente = await registration.pushManager.getSubscription()
    const subscription = existente || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    })

    const json = subscription.toJSON() as { endpoint: string; keys?: { p256dh: string; auth: string } }
    if (!json.keys) return 'erro'
    await pushSubscriptionsService.salvar(uid, { endpoint: json.endpoint, keys: json.keys })
    return 'subscribed'
  } catch (e) {
    console.error(e)
    return 'erro'
  }
}

export async function notificacoesPushAtivas(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
  if (Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}
