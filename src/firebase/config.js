// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration from environment variables
// Debug: Check if environment variables are loading
console.log('Environment check:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? 'LOADED' : 'MISSING',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? 'LOADED' : 'MISSING',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? 'LOADED' : 'MISSING'
});

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Validate config
if (!firebaseConfig.apiKey) {
  throw new Error('Firebase API key is missing. Check your .env file.');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
