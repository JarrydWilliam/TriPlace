/**
 * Content Moderation Layer
 * 
 * Middleware to ensure community safety.
 * Currently simulates AI moderation with strict keyword filtering.
 * In production, this would call OpenAI/Google Cloud moderation APIs.
 */

export interface ModerationResult {
  safe: boolean;
  categories: string[];
  reason?: string;
}

// Placeholder for toxic keywords (real app would use AI model)
const TOXIC_KEYWORDS = [
  "spam", "scam", "hate", "violence", "kill", "attack", 
  "buy followers", "crypto pump", "xxx", "nsfw"
];

export class Moderator {
  /**
   * Check if text content is safe to post.
   */
  async checkContentSafety(text: string): Promise<ModerationResult> {
    const lowerText = text.toLowerCase();
    const categories: string[] = [];

    // Simple keyword matching for simulation
    const foundKeywords = TOXIC_KEYWORDS.filter(word => lowerText.includes(word));

    if (foundKeywords.length > 0) {
      categories.push("toxicity");
      return {
        safe: false,
        categories,
        reason: `Content flagged for safety (${foundKeywords.join(", ")})`
      };
    }

    // Identify if it's too short/spammy
    if (text.length < 5 && !text.includes("?")) {
      return {
        safe: true, // Allow but maybe flag low quality in future
        categories: ["low_quality"],
        reason: "Content is very short"
      };
    }

    return {
      safe: true,
      categories: []
    };
  }
}

export const moderator = new Moderator();
