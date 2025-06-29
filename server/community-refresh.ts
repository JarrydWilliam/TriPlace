import { storage } from './storage';
import { aiMatcher } from './ai-matching';
import { User } from '@shared/schema';

export class CommunityRefreshService {
  async regenerateAllUserCommunities(): Promise<void> {
    console.log('Community Refresh: Starting global community regeneration');
    
    try {
      // Get all users with location data
      const users = await storage.getAllUsers();
      const usersWithLocation = users.filter(user => user.latitude && user.longitude);
      
      console.log(`Community Refresh: Found ${usersWithLocation.length} users with location data`);
      
      // Process users in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < usersWithLocation.length; i += batchSize) {
        const batch = usersWithLocation.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (user) => {
          try {
            console.log(`Community Refresh: Regenerating communities for ${user.name} (${user.id})`);
            
            // Generate fresh communities for each user based on their location and quiz data
            await storage.generateDynamicCommunities(user.id);
            
            console.log(`Community Refresh: Completed for ${user.name}`);
          } catch (error) {
            console.error(`Community Refresh: Failed for user ${user.id}:`, error);
          }
        }));
        
        // Brief pause between batches to prevent API rate limiting
        if (i + batchSize < usersWithLocation.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Community Refresh: Global regeneration complete');
      
      // Notify all connected clients about the update
      this.notifyAllClients();
      
    } catch (error) {
      console.error('Community Refresh: Global regeneration failed:', error);
      throw error;
    }
  }
  
  private notifyAllClients(): void {
    // This will be picked up by the service worker messaging system
    console.log('Community Refresh: Broadcasting update to all PWA clients');
  }
  
  async refreshUserCommunities(userId: number): Promise<void> {
    console.log(`Community Refresh: Refreshing communities for user ${userId}`);
    
    try {
      // Clear existing communities for this user
      const userCommunities = await storage.getUserCommunities(userId);
      for (const community of userCommunities) {
        await storage.leaveCommunity(userId, community.id);
      }
      
      // Generate fresh communities
      await storage.generateDynamicCommunities(userId);
      
      console.log(`Community Refresh: Completed refresh for user ${userId}`);
    } catch (error) {
      console.error(`Community Refresh: Failed to refresh user ${userId}:`, error);
      throw error;
    }
  }
}

export const communityRefreshService = new CommunityRefreshService();