import { storage } from './storage';
import { aiMatcher } from './ai-matching';
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
      // Clear existing communities for this user
      const userCommunities = await storage.getUserCommunities(userId);
      for (const community of userCommunities) {
        await storage.leaveCommunity(userId, community.id);
      }
      
      // Generate fresh communities and assign user to them
      const matchedCommunities = await storage.generateDynamicCommunities(userId);
      
      // Join user to their matched communities
      for (const community of matchedCommunities) {
        try {
          await storage.joinCommunity(userId, community.id);
        } catch (joinError) {
          console.error(`Community Refresh: Failed to join user ${userId} to "${community.name}":`, joinError);
        }
      }
      
    } catch (error) {
      console.error(`Community Refresh: Failed to refresh user ${userId}:`, error);
      throw error;
    }
  }
}

export const communityRefreshService = new CommunityRefreshService();