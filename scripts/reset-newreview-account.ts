import { db } from "../server/db";
import { users, communityMembers } from "@shared/schema";
import { eq } from "drizzle-orm";

const NEW_REVIEW_EMAIL = "samevibe.newreview@gmail.com";

async function resetNewReviewAccount() {
  console.log(`Starting reset for ${NEW_REVIEW_EMAIL}...`);

  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, NEW_REVIEW_EMAIL)
  });

  if (!targetUser) {
    console.log(`User ${NEW_REVIEW_EMAIL} not found. Please create this account manually through the app (using the private password) before running this script.`);
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`Found user with ID: ${userId}`);

  // Use a transaction to ensure all resets happen atomically
  await db.transaction(async (tx) => {
    console.log("Deleting joined communities...");
    await tx.delete(communityMembers).where(eq(communityMembers.userId, userId));

    console.log("Resetting onboarding, interests, and location state...");
    await tx.update(users)
      .set({
        onboardingCompleted: false,
        latitude: null,
        longitude: null,
        locationName: null,
        interests: [],
      })
      .where(eq(users.id, userId));
  });

  console.log("Reset complete. The account is now ready for a clean onboarding review.");
  process.exit(0);
}

resetNewReviewAccount().catch((err) => {
  console.error("Error resetting account:", err);
  process.exit(1);
});
