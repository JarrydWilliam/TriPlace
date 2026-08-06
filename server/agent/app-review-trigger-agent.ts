import { storage } from "../storage.js";

export class AppReviewTriggerAgent {
  /**
   * Check if a user has hit a high-delight moment eligible for SKStoreReviewController rating prompt
   */
  async evaluateReviewEligibility(userId: number): Promise<{
    shouldPromptReview: boolean;
    delightReason?: string;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return { shouldPromptReview: false };

      const userCommunities = await storage.getUserCommunities(userId);
      
      // High-delight trigger: User joined 2+ active communities or has high engagement
      if (userCommunities.length >= 2) {
        console.log(`[AppReviewTriggerAgent] User ${userId} is eligible for App Store Review prompt (Reason: Joined ${userCommunities.length} communities)`);
        return {
          shouldPromptReview: true,
          delightReason: `Joined ${userCommunities.length} active communities`
        };
      }

      return { shouldPromptReview: false };
    } catch (error) {
      console.error("[AppReviewTriggerAgent] Error evaluating review eligibility:", error);
      return { shouldPromptReview: false };
    }
  }
}

export const appReviewTriggerAgent = new AppReviewTriggerAgent();
