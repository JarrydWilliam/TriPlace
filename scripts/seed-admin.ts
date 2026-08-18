import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_FIREBASE_API_KEY;

async function seedAdminAccount() {
  const email = "support@samevibeapp.com";
  const password = "SameVibe2024!";
  let firebaseUid: string | null = null;

  console.log(`Setting up Admin Account (${email}) with password '${password}'...`);

  if (!API_KEY || API_KEY === 'mock_key') {
    console.log("Firebase API key is mock or missing. Updating DB record directly...");
  } else {
    try {
      console.log(`Creating/Ensuring Firebase account for ${email}...`);
      let signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      let authData = await signUpRes.json();

      if (authData.error && authData.error.message === 'EMAIL_EXISTS') {
        console.log(`Firebase account ${email} already exists. Authenticating...`);
        let signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        authData = await signInRes.json();
      }

      if (authData.localId) {
        firebaseUid = authData.localId;
        console.log(`✅ Firebase Account Active! UID: ${authData.localId}`);
      } else {
        console.warn("Firebase Account Setup Notice:", authData);
      }
    } catch (err: any) {
      console.warn("Firebase authentication attempt notice:", err.message);
    }
  }

  // Ensure DB User record exists for support@samevibeapp.com
  if (process.env.DATABASE_URL) {
    try {
      console.log('Connecting to PostgreSQL database...');
      const sql = neon(process.env.DATABASE_URL);
      const db = drizzle(sql, { schema });

      const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, email));

      if (existingUser) {
        console.log(`User ${email} already exists in DB. Updating admin profile and Firebase UID (${firebaseUid || existingUser.firebaseUid})...`);
        await db.update(schema.users).set({
          firebaseUid: firebaseUid || existingUser.firebaseUid,
          onboardingCompleted: true,
          name: "SameVibe Founder / Support",
          avatar: "/logo.png",
          bio: "Founder & Growth Administrator Account",
          interests: ["tech", "community", "hiking", "music"],
          location: "Salt Lake City, UT",
        }).where(eq(schema.users.email, email));
        console.log('✅ Admin profile updated successfully with logo avatar.');
      } else {
        console.log(`Creating DB profile for ${email}...`);
        await db.insert(schema.users).values({
          firebaseUid: `admin_${Date.now()}`,
          email,
          name: "SameVibe Founder / Support",
          avatar: "/logo.png",
          bio: "Founder & Growth Administrator Account",
          interests: ["tech", "community", "hiking", "music"],
          location: "Salt Lake City, UT",
          onboardingCompleted: true,
        });
        console.log('✅ Admin profile created successfully with logo avatar.');
      }
    } catch (dbErr: any) {
      console.warn("Database sync notice:", dbErr.message);
    }
  }

  console.log("=========================================");
  console.log(`Admin Account Configured:`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log("=========================================");
}

seedAdminAccount().catch(console.error);
