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
    console.log('Community Update: Starting global refresh for all users');
    
    // Clear all existing communities
    const allUsers = await storage.getAllUsers();
    console.log(`Community Update: Found ${allUsers.length} total users`);
    
    const usersWithLocation = allUsers.filter(user => user.latitude && user.longitude);
    console.log(`Community Update: Found ${usersWithLocation.length} users with location data`);
    
    // Process users individually to regenerate location-specific communities
    for (const user of usersWithLocation) {
      try {
        console.log(`Community Update: Processing ${user.name} at ${user.location || 'unknown location'}`);
        
        // Generate fresh communities for this user's location
        await storage.generateDynamicCommunities(user.id);
        
        console.log(`Community Update: Completed for ${user.name}`);
      } catch (error) {
        console.error(`Community Update: Failed for user ${user.id}:`, error);
      }
    }
    
    // Update timestamp to signal clients
    this.updateTimestamp = Date.now();
    console.log(`Community Update: Global refresh completed at ${new Date(this.updateTimestamp).toISOString()}`);
  }

  getLastUpdateTimestamp(): number {
    return this.updateTimestamp;
  }

  hasUpdatesFor(clientTimestamp: number): boolean {
    return this.updateTimestamp > clientTimestamp;
  }
}

export const communityUpdateNotifier = CommunityUpdateNotifier.getInstance();