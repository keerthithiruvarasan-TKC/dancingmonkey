
// @ts-ignore
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getFirestore } from "firebase/firestore";
// @ts-ignore
import { getAuth } from "firebase/auth";
// @ts-ignore
import { getStorage } from "firebase/storage";

// ------------------------------------------------------------------
// INSTRUCTIONS FOR SETUP:
// 1. You do NOT need to run 'npm install'. The app handles this automatically.
// 2. On the Firebase screen you are looking at, scroll down to the code block.
// 3. Find the 'firebaseConfig' object (it looks like the one below).
// 4. Copy those keys and replace the placeholders below.
// ------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: "AIzaSyD-YOUR-REAL-API-KEY",             // Replace this
  authDomain: "your-real-project.firebaseapp.com", // Replace this
  projectId: "your-real-project-id",               // Replace this
  storageBucket: "your-real-project.appspot.com",  // Replace this
  messagingSenderId: "123456789",                  // Replace this
  appId: "1:123456789:web:abcdef"                  // Replace this
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
