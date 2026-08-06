import { storage } from "../storage.js";

export interface SupportTicket {
  id: string;
  userId?: number;
  source: "email" | "app_store" | "in_app";
  category: "bug" | "feedback" | "inquiry" | "safety";
  rawMessage: string;
  suggestedResponse: string;
  requiresFounderReview: boolean;
  createdAt: Date;
}

export class UserSupportAgent {
  /**
   * Process incoming user support or app store feedback
   */
  async processIncomingFeedback(
    source: "email" | "app_store" | "in_app",
    rawMessage: string,
    userId?: number
  ): Promise<SupportTicket> {
    const isBug = /bug|error|crash|fail|broken|freeze/i.test(rawMessage);
    const isSafety = /harass|abuse|unsafe|creep|fake/i.test(rawMessage);

    let category: SupportTicket["category"] = "inquiry";
    if (isSafety) category = "safety";
    else if (isBug) category = "bug";
    else if (/love|great|awesome|feature|add/i.test(rawMessage)) category = "feedback";

    let suggestedResponse = "";
    if (category === "safety") {
      suggestedResponse = "Thank you for alerting us. SameVibe takes safety seriously. Our moderation team is reviewing this report immediately.";
    } else if (category === "bug") {
      suggestedResponse = "Thanks for reporting this! Our technical team is investigating the issue. We appreciate your patience.";
    } else {
      suggestedResponse = "Thank you for reaching out to SameVibe! We love hearing from our community members and are glad you're with us.";
    }

    const ticket: SupportTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      source,
      category,
      rawMessage,
      suggestedResponse,
      requiresFounderReview: category === "safety" || isBug,
      createdAt: new Date(),
    };

    console.log(`[UserSupportAgent] Processed ${category} ticket from ${source}`);
    return ticket;
  }
}

export const userSupportAgent = new UserSupportAgent();
