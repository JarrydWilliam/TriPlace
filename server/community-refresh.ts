import { storage } from './storage.js';
import { aiMatcher } from './ai-matching.js';
import { User } from '@shared/schema';

export class CommunityRefreshService {
  async regenerateAllUserCommunities(): Promise<void> {
    
    try {
      // Get all users with location data
      const users = await storage.getAllUsers();
      const usersWithLocation = users.filter(user => user.latitude && user.longitude);
      
      
      // Process users in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < usersWithLocation.length; i += batchSize) {
        const batch = usersWithLocation.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            
            // Clear existing community memberships for fresh matching
            await storage.clearUserCommunities(user.id);
            
            // Generate compatible communities for this user
            const matchedCommunities = await storage.generateDynamicCommunities(user.id);
            
            // Join user to their matched communities
            for (const community of matchedCommunities) {
              try {
                await storage.joinCommunity(user.id, community.id);
              } catch (joinError) {
                console.error(`Community Refresh: Failed to join ${user.name} to "${community.name}":`, joinError);
              }
            }
            
          } catch (error) {
            console.error(`Community Refresh: Failed for user ${user.id}:`, error);
          }
        }));
        
        // Brief pause between batches to prevent API rate limiting
        if (i + batchSize < usersWithLocation.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      
      // Notify all connected clients about the update
      this.notifyAllClients();
      
    } catch (error) {
      console.error('Community Refresh: Global regeneration failed:', error);
      throw error;
    }
  }
  
  private notifyAllClients(): void {
    // This will be picked up by the service worker messaging system
  }
  
  async refreshUserCommunities(userId: number): Promise<void> {
    try {
      // Founder decision (2026-07-31): Additive-only — never clear existing memberships during refresh.
      // Delegated to assignOnboardingCommunities which ensures the user has up to 3 matched communities.
      await storage.assignOnboardingCommunities(userId);
    } catch (error) {
      console.error(`Community Refresh: Failed to refresh user ${userId}:`, error);
      throw error;
    }
  }
}

export const communityRefreshService = new CommunityRefreshService();