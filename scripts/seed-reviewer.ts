import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_FIREBASE_API_KEY;

async function run() {
  const email = "samevibe.review@gmail.com";
  const password = "SameVibe2024!";

  console.log(`Authenticating ${email} with Firebase REST API...`);
  
  let authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });

  let authData = await authRes.json();

  if (authData.error && authData.error.message === 'EMAIL_NOT_FOUND') {
    console.log(`User not found. Creating ${email} in Firebase...`);
    authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    authData = await authRes.json();
    if (authData.error) {
      console.error("Error creating user:", authData.error);
      process.exit(1);
    }
  } else if (authData.error) {
    console.error("Firebase auth error:", authData.error);
    process.exit(1);
  }

  const uid = authData.localId;
  console.log(`Successfully authenticated! Firebase UID: ${uid}`);

  console.log('Connecting to Neon Postgres...');
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.firebaseUid, uid));

  if (existingUser) {
    console.log(`User ${uid} already exists in Postgres. Updating to ensure onboarding is complete...`);
    await db.update(schema.users).set({
      onboardingCompleted: true,
      name: "Apple Reviewer",
      bio: "App Store Review Account",
      interests: ["music", "tech", "food"],
      location: "San Francisco, CA"
    }).where(eq(schema.users.firebaseUid, uid));
    console.log('Update successful.');
  } else {
    console.log(`User ${uid} not found in Postgres. Creating profile...`);
    await db.insert(schema.users).values({
      firebaseUid: uid,
      email: email,
      name: "Apple Reviewer",
      bio: "App Store Review Account",
      interests: ["music", "tech", "food"],
      location: "San Francisco, CA",
      onboardingCompleted: true
    });
    console.log('Creation successful.');
  }

  console.log('Reviewer account setup complete!');
}

run().catch(console.error);
