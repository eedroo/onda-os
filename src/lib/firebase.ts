import { initializeApp, getApps } from 'firebase/app'
import { initializeFirestore, getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Evita inicializar múltiplas vezes em desenvolvimento
const jaExistia = getApps().length > 0
const app = jaExistia ? getApps()[0] : initializeApp(firebaseConfig)

// ignoreUndefinedProperties evita que updateDoc/setDoc falhem quando um campo
// opcional é limpo para undefined (ex: dataLimite, descricao)
export const db   = jaExistia ? getFirestore(app) : initializeFirestore(app, { ignoreUndefinedProperties: true })
export const auth = getAuth(app)
export default app
