import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "../shared/schema.js";
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_FIREBASE_API_KEY;

const ADMIN_ACCOUNTS = [
  { email: "support@samevibeapp.com", password: "SameVibe2024!", name: "SameVibe Support Admin" },
  { email: "jarryd@samevibeapp.com", password: "SameVibe!", name: "Jarryd Burke (Founder)" },
];

async function seedAdminAccount() {
  for (const acc of ADMIN_ACCOUNTS) {
    const { email, password, name } = acc;
    let firebaseUid: string | null = null;

    console.log(`Setting up Admin Account (${email})...`);

    if (API_KEY && API_KEY !== 'mock_key') {
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
          console.log(`✅ Firebase Account Active for ${email}! UID: ${authData.localId}`);
        }
      } catch (err: any) {
        console.warn(`Firebase notice for ${email}:`, err.message);
      }
    }

    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL);
        const db = drizzle(sql, { schema });

        const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.email, email));

        if (existingUser) {
          console.log(`User ${email} exists in DB. Updating profile & UID...`);
          await db.update(schema.users).set({
            name,
            avatar: "/logo.png",
            onboardingCompleted: true,
            firebaseUid: firebaseUid || existingUser.firebaseUid || `admin_${Date.now()}`,
          }).where(eq(schema.users.id, existingUser.id));
        } else {
          console.log(`Inserting DB record for ${email}...`);
          await db.insert(schema.users).values({
            firebaseUid: firebaseUid || `admin_uid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            email,
            name,
            avatar: "/logo.png",
            location: "Salt Lake City, UT",
            interests: ["Technology", "Outdoors", "Networking", "Community Growth"],
            onboardingCompleted: true,
          });
        }
        console.log(`✅ Database User for ${email} fully synchronized!`);
      } catch (dbErr: any) {
        console.error(`DB Error for ${email}:`, dbErr);
      }
    }
  }
}

seedAdminAccount().then(() => {
  console.log("🎉 All Admin accounts successfully provisioned!");
  process.exit(0);
}).catch(err => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
