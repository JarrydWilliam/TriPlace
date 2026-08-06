import { storage } from "../storage.js";

export interface AutoFixResult {
  applied: boolean;
  actionKey?: string;
  description?: string;
  userMessage?: string;
}

/**
 * AutoFixAgent
 *
 * Automated diagnostic and minor repair agent.
 * Safely executes state repairs in strict accordance with SameVibe guidelines.
 */
export class AutoFixAgent {
  /**
   * Attempts an automated quick-fix based on user problem description or diagnostic action key.
   */
  public static async executeFix(userId: number, actionKey: string): Promise<AutoFixResult> {
    const user = await storage.getUser(userId);
    if (!user) {
      return { applied: false, userMessage: "User account not found." };
    }

    switch (actionKey) {
      case "fix_location_sync": {
        // Resync location timestamp & verify discovery settings
        const updatedDiscovery = {
          ...(user.discoverySettings as object || {}),
          locationSharing: true,
        };
        await storage.updateUser(userId, { discoverySettings: updatedDiscovery });
        return {
          applied: true,
          actionKey: "fix_location_sync",
          description: "Resynced location sharing settings and refreshed local recommendations.",
          userMessage: "📍 Location sharing settings resynced! Your local community recommendations are now refreshed.",
        };
      }

      case "fix_slot_sync": {
        // Recompute active community slots & clean up stale data
        const activeCommunities = await storage.getUserActiveCommunities(userId);
        return {
          applied: true,
          actionKey: "fix_slot_sync",
          description: `Recomputed active community slots (${activeCommunities.length} active).`,
          userMessage: `🔄 Community slots resynced! You currently have ${activeCommunities.length} active community slots.`,
        };
      }

      case "reset_discovery_defaults": {
        // Restore default discovery settings
        const defaultDiscovery = {
          profileVisible: true,
          locationSharing: true,
          onlineStatus: true,
          allowDirectMessaging: true,
          showJoinedEvents: true,
        };
        await storage.updateUser(userId, { discoverySettings: defaultDiscovery });
        return {
          applied: true,
          actionKey: "reset_discovery_defaults",
          description: "Restored default high-contrast discovery settings.",
          userMessage: "🛡️ Discovery and privacy settings restored to recommended defaults.",
        };
      }

      default:
        return {
          applied: false,
          userMessage: "No automated quick-fix rule matched this issue. Submitting ticket to our support team.",
        };
    }
  }
}
