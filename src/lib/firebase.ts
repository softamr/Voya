
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDV91LYhSGcvDeQi3P7StytOaIDsAO9rbk",
  authDomain: "voya-tracker.firebaseapp.com",
  projectId: "voya-tracker",
  storageBucket: "voya-tracker.firebasestorage.app", // Corrected from .firebasestorage.app to .appspot.com if that's the typical format, or keep as is if correct. User provided .firebasestorage.app
  messagingSenderId: "185212810862",
  appId: "1:185212810862:web:80998db8c1dbee97dbd87f"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
