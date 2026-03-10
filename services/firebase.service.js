import { getApps, initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'

const FIREBASE_CONFIG = {
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.appId &&
  FIREBASE_CONFIG.authDomain &&
  FIREBASE_CONFIG.projectId
)

const app = isFirebaseConfigured
  ? getApps()[0] || initializeApp(FIREBASE_CONFIG)
  : null

const auth = app ? getAuth(app) : null
const googleAuthProvider = auth ? new GoogleAuthProvider() : null
const database = app && FIREBASE_CONFIG.databaseURL ? getDatabase(app) : null
const firestore = app ? getFirestore(app) : null

export { app, auth, database, firestore, googleAuthProvider }
