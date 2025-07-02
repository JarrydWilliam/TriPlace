import { storage } from './storage';

export class CommunityUpdateNotifier {
  private static instance: CommunityUpdateNotifier;
  private updateTimestamp: number = Date.now();

  static getInstance(): CommunityUpdateNotifier {
    if (!this.instance) {
      this.instance = new CommunityUpdateNotifier();
    }
    return this.instance;
  }

  async triggerGlobalCommunityRefresh(): Promise<void> {
    
    // Clear all existing communities
    const allUsers = await storage.getAllUsers();
    
    const usersWithLocation = allUsers.filter(user => user.latitude && user.longitude);
    
    // Process users individually to regenerate location-specific communities
    for (const user of usersWithLocation) {
      try {
        
        // Generate fresh communities for this user's location
        await storage.generateDynamicCommunities(user.id);
        
      } catch (error) {
        console.error(`Community Update: Failed for user ${user.id}:`, error);
      }
    }
    
    // Update timestamp to signal clients
    this.updateTimestamp = Date.now();
  }

  getLastUpdateTimestamp(): number {
    return this.updateTimestamp;
  }

  hasUpdatesFor(clientTimestamp: number): boolean {
    return this.updateTimestamp > clientTimestamp;
  }
}

export const communityUpdateNotifier = CommunityUpdateNotifier.getInstance();