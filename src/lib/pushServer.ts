import webpush from 'web-push'
import { getAdminDb } from './firebaseAdmin'

const CONTATO = 'carlinhos686@gmail.com'

export interface PushPayload {
  title: string
  body: string
  url: string
}

export async function enviarPushParaTodos(payload: PushPayload): Promise<number> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) return 0

  webpush.setVapidDetails(`mailto:${CONTATO}`, vapidPublic, vapidPrivate)

  try {
    const db = getAdminDb()
    const snap = await db.collection('pushSubscriptions').get()
    const body = JSON.stringify(payload)

    let enviados = 0
    await Promise.all(snap.docs.map(async d => {
      const sub = d.data() as { endpoint: string; keys: { p256dh: string; auth: string } }
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body)
        enviados++
      } catch (e: unknown) {
        const statusCode = (e as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) await d.ref.delete()
        else console.error(e)
      }
    }))
    return enviados
  } catch (e) {
    console.error(e)
    return 0
  }
}
