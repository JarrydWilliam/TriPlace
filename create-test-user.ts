import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_STORAGE_BUCKET}.firebasestorage.app`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function createTestAccount() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, "samevibe.demo@gmail.com", "SameVibe2024!");
    console.log("Test account created successfully:", userCredential.user.uid);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Test account already exists.");
    } else {
      console.error("Error creating test account:", error);
    }
  }
  process.exit(0);
}

createTestAccount();
