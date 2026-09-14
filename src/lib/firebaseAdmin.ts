import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não configurada')
    // Aceita tanto o JSON em bruto como base64 — em base64 porque colar o JSON
    // (com os "\n" da private_key) directamente num campo de env var em UIs
    // como a do Vercel corrompe frequentemente esses escapes.
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8')
    initializeApp({ credential: cert(JSON.parse(json)) })
  }
  return getFirestore()
}
