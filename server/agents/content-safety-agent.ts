import { storage } from "../storage.js";
import { type InsertFlaggedContent } from "../../shared/schema.js";

/**
 * ContentSafetyAgent
 *
 * Automated content moderation agent for SameVibe.
 * Subscribes to content submissions (communityMessages, eventComments, userProfiles).
 * Evaluates submissions against 5 safety categories:
 *  1. Violence & Graphic Content
 *  2. Hate Speech & Slurs
 *  3. Sexually Explicit / Nudity
 *  4. Illegal Goods / Services
 *  5. Doxxing & Personal Contact Info Exposure
 */
export class ContentSafetyAgent {
  // Pattern rules
  private static DOXXING_PATTERNS = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // US Phone numbers
    /\b\d{3}-\d{2}-\d{4}\b/,         // SSN pattern
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/, // Credit cards
  ];

  private static VIOLENCE_KEYWORDS = [
    "kill", "murder", "assault", "decapitate", "bomb", "shootup", "terrorist", "bloodbath", "mutilate"
  ];

  private static HATE_KEYWORDS = [
    "nigger", "faggot", "kike", "spic", "chink", "retard", "whore", "cunt"
  ];

  private static ILLEGAL_KEYWORDS = [
    "buy fentanyl", "sell cocaine", "buy meth", "stolen cards", "darknet market", "hitman"
  ];

  private static EXPLICIT_KEYWORDS = [
    "nsfw", "hardcore porn", "child porn", "sex video", "onlyfans leaks"
  ];

  /**
   * Inspects a text snippet before or after creation.
   * Returns inspection verdict and automatically logs violations to DB.
   */
  public static async inspectAndLog(
    text: string,
    authorId: number,
    contentType: "communityMessage" | "eventComment" | "userProfile",
    contentId?: number
  ): Promise<{ safe: boolean; reason?: string; flagId?: number }> {
    if (!text || text.trim().length === 0) {
      return { safe: true };
    }

    const lowerText = text.toLowerCase();
    let flagReason: string | null = null;
    let confidenceScore = 1.0;

    // Check 1: Doxxing / Contact info leakage
    for (const pattern of this.DOXXING_PATTERNS) {
      if (pattern.test(text)) {
        flagReason = "doxxing";
        break;
      }
    }

    // Check 2: Hate speech
    if (!flagReason) {
      for (const kw of this.HATE_KEYWORDS) {
        if (lowerText.includes(kw)) {
          flagReason = "hate_speech";
          break;
        }
      }
    }

    // Check 3: Violence
    if (!flagReason) {
      for (const kw of this.VIOLENCE_KEYWORDS) {
        if (lowerText.includes(kw)) {
          flagReason = "violence";
          break;
        }
      }
    }

    // Check 4: Illegal goods
    if (!flagReason) {
      for (const kw of this.ILLEGAL_KEYWORDS) {
        if (lowerText.includes(kw)) {
          flagReason = "illegal";
          break;
        }
      }
    }

    // Check 5: Explicit content
    if (!flagReason) {
      for (const kw of this.EXPLICIT_KEYWORDS) {
        if (lowerText.includes(kw)) {
          flagReason = "explicit";
          break;
        }
      }
    }

    if (flagReason) {
      const entry: InsertFlaggedContent = {
        contentType,
        contentId: contentId ?? null,
        authorId,
        flagReason,
        contentSnippet: text.slice(0, 500),
        confidenceScore,
        status: "pending",
      };

      const logged = await storage.createFlaggedContentLog(entry);
      console.warn(`[ContentSafetyAgent] FLAGGED content from user ${authorId} (${flagReason}): "${text.slice(0, 50)}..."`);
      return { safe: false, reason: flagReason, flagId: logged.id };
    }

    return { safe: true };
  }
}
