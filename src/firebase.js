// Initialize Firebase

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBrsv7rNfBgflhaDwbwaGVNXv1XySOvJXU",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "freelancechain-5dfb1.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "freelancechain-5dfb1",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "freelancechain-5dfb1.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "125799745857",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:125799745857:web:64cb0c7526d9896d02f9c0",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://freelancechain-5dfb1-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export default app;