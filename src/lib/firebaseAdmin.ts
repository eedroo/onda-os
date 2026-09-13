import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não configurada')
    initializeApp({ credential: cert(JSON.parse(raw)) })
  }
  return getFirestore()
}
