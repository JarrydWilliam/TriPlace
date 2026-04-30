import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or use cert if you have a service account JSON
    databaseURL: "https://samevibe-app.firebaseio.com"
  });
}

export const db = admin.firestore(); 