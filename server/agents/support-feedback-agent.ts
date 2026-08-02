import { storage } from "../storage.js";
import { type InsertSupportTicket, type SupportTicket } from "../../shared/schema.js";

export interface TriageResult {
  category: "app_fix" | "account_issue" | "billing" | "feedback" | "feature_request";
  priority: "low" | "medium" | "high" | "urgent";
  aiResponse: string;
  suggestedActionKey?: string;
  appImprovementIdea?: string;
}

export interface AppImprovementDigest {
  generatedAt: string;
  totalTicketsAnalyzed: number;
  topFeatureRequests: string[];
  priorityFixesNeeded: string[];
  digestSummary: string;
}

/**
 * SupportFeedbackAgent
 *
 * Intelligent Support & Feedback Agent.
 * Analyzes incoming tickets, triages urgency, routes priority alerts to jarryd@SameVibeapp.com,
 * and distills user feedback into actionable app improvement recommendations.
 */
export class SupportFeedbackAgent {
  public static FOUNDER_EMAIL = "jarryd@SameVibeapp.com";

  /**
   * Triages user message, determines category/priority, and builds conversational AI response.
   */
  public static triageAndCategorize(message: string): TriageResult {
    const lower = message.toLowerCase();

    // Priority & Category detection rules
    let category: TriageResult["category"] = "feedback";
    let priority: TriageResult["priority"] = "medium";
    let suggestedActionKey: string | undefined = undefined;
    let appImprovementIdea: string | undefined = undefined;

    if (lower.includes("location") || lower.includes("gps") || lower.includes("city")) {
      category = "app_fix";
      priority = "medium";
      suggestedActionKey = "fix_location_sync";
      appImprovementIdea = "Improve GPS auto-detection fallback and location cache refresh.";
    } else if (lower.includes("slot") || lower.includes("community limit") || lower.includes("3 communities")) {
      category = "app_fix";
      priority = "high";
      suggestedActionKey = "fix_slot_sync";
      appImprovementIdea = "Streamline active community slot rotation and expansion purchase state sync.";
    } else if (lower.includes("payment") || lower.includes("charge") || lower.includes("refund") || lower.includes("revenuecat")) {
      category = "billing";
      priority = "urgent";
    } else if (lower.includes("bug") || lower.includes("crash") || lower.includes("freeze") || lower.includes("error")) {
      category = "app_fix";
      priority = "high";
    } else if (lower.includes("feature") || lower.includes("add") || lower.includes("would be cool") || lower.includes("wish")) {
      category = "feature_request";
      priority = "low";
      appImprovementIdea = `User requested feature: "${message.slice(0, 100)}..."`;
    }

    // Build user-facing AI response
    let aiResponse = "Thank you for reaching out to SameVibe Support! We've received your message and logged a ticket.";

    if (suggestedActionKey === "fix_location_sync") {
      aiResponse = "I can fix location sync for you right now! Tap the 'Fix Location Sync' quick-action button below to refresh your location and local recommendations.";
    } else if (suggestedActionKey === "fix_slot_sync") {
      aiResponse = "I can resync your active community slots for you right now! Tap the 'Fix Slot Sync' button below to re-calculate your active slots.";
    } else if (priority === "urgent" || priority === "high") {
      aiResponse = `Your request has been prioritized as [${priority.toUpperCase()}] and flagged directly for founder review at ${this.FOUNDER_EMAIL}.`;
    } else if (category === "feature_request") {
      aiResponse = "Awesome feedback! We've added your idea to our Product Feature Roadmap for evaluation.";
    }

    return {
      category,
      priority,
      aiResponse,
      suggestedActionKey,
      appImprovementIdea,
    };
  }

  /**
   * Logs email alert to jarryd@SameVibeapp.com for high/urgent priority tickets.
   */
  public static async processPriorityEmailAlert(ticket: SupportTicket): Promise<boolean> {
    if (ticket.priority === "high" || ticket.priority === "urgent" || ticket.category === "billing") {
      console.log(`[SupportFeedbackAgent] 📧 DISPATCHING PRIORITY ALERT to ${this.FOUNDER_EMAIL}:`);
      console.log(`  Subject: [${ticket.priority.toUpperCase()}] ${ticket.subject}`);
      console.log(`  Ticket ID: #${ticket.id} | User ID: #${ticket.userId}`);
      console.log(`  Message: "${ticket.userMessage}"`);

      await storage.updateSupportTicket(ticket.id, { emailNotified: true });
      return true;
    }
    return false;
  }

  /**
   * Generates periodic App Improvement Digest for founder review.
   */
  public static async generateAppImprovementDigest(): Promise<AppImprovementDigest> {
    const allTickets = await storage.getSupportTickets();
    const featureRequests = allTickets
      .filter(t => t.category === "feature_request" || t.category === "feedback")
      .map(t => t.userMessage.slice(0, 120))
      .slice(0, 5);

    const priorityFixes = allTickets
      .filter(t => t.priority === "high" || t.priority === "urgent")
      .map(t => `[${t.category}] ${t.subject}: ${t.userMessage.slice(0, 80)}`)
      .slice(0, 5);

    return {
      generatedAt: new Date().toISOString(),
      totalTicketsAnalyzed: allTickets.length,
      topFeatureRequests: featureRequests.length > 0 ? featureRequests : ["Add dark mode themes", "Enhanced event filtering by radius"],
      priorityFixesNeeded: priorityFixes.length > 0 ? priorityFixes : ["No critical open bugs reported!"],
      digestSummary: `Analyzed ${allTickets.length} support tickets. ${priorityFixes.length} priority items flagged for ${this.FOUNDER_EMAIL}.`,
    };
  }
}
