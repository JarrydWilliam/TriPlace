import * as cron from 'node-cron';
import { eventScraperOrchestrator } from '../scrapers/eventScraperOrchestrator';
import { storage } from '../storage';

export class EventScrapingScheduler {
  private isRunning = false;

  /**
   * Start the scheduled event scraping
   */
  startScheduling(): void {
    console.log('Starting event scraping scheduler...');
    
    // Run every 6 hours: at 12:00 AM, 6:00 AM, 12:00 PM, and 6:00 PM
    cron.schedule('0 */6 * * *', async () => {
      if (this.isRunning) {
        console.log('Event scraping already in progress, skipping...');
        return;
      }
      
      await this.runScheduledScraping();
    });

    // Also run once at startup after 30 seconds
    setTimeout(() => {
      this.runScheduledScraping();
    }, 30000);

    console.log('Event scraping scheduler started - will run every 6 hours');
  }

  /**
   * Run the scheduled scraping for all active users
   */
  private async runScheduledScraping(): Promise<void> {
    this.isRunning = true;
    
    try {
      console.log('Starting scheduled event scraping...');
      
      // Get all users with communities
      const users = await storage.getAllUsers();
      const usersWithLocation = users.filter(user => 
        user.latitude && user.longitude && user.onboardingCompleted
      );

      if (usersWithLocation.length === 0) {
        console.log('No users with location data found for event scraping');
        return;
      }

      // Use the first user's location as a representative location
      // In production, you might want to group by geographic regions
      const representativeUser = usersWithLocation[0];
      const userLocation = {
        lat: parseFloat(representativeUser.latitude!),
        lon: parseFloat(representativeUser.longitude!)
      };

      const result = await eventScraperOrchestrator.scrapeEventsForAllCommunities(userLocation);
      
      console.log(`Scheduled scraping completed: ${result.totalEvents} events across ${result.communitiesUpdated} communities`);
      
      if (result.errors.length > 0) {
        console.error('Scraping errors:', result.errors);
      }

    } catch (error) {
      console.error('Scheduled event scraping failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger event scraping
   */
  async triggerManualScraping(userLocation: { lat: number, lon: number }): Promise<{
    totalEvents: number;
    communitiesUpdated: number;
    errors: string[];
  }> {
    if (this.isRunning) {
      throw new Error('Event scraping is already in progress');
    }

    this.isRunning = true;
    
    try {
      const result = await eventScraperOrchestrator.scrapeEventsForAllCommunities(userLocation);
      console.log(`Manual scraping completed: ${result.totalEvents} events across ${result.communitiesUpdated} communities`);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if scraping is currently running
   */
  isScrapingInProgress(): boolean {
    return this.isRunning;
  }

  /**
   * Get scraping status and statistics
   */
  async getScrapingStatus(): Promise<{
    isRunning: boolean;
    lastScrapingTime?: Date;
    totalEvents: number;
    totalCommunities: number;
  }> {
    const communities = await storage.getCommunities();
    
    let totalEvents = 0;
    for (const community of communities) {
      const events = await storage.getEventsForCommunity(community.id);
      totalEvents += events.length;
    }

    return {
      isRunning: this.isRunning,
      totalEvents,
      totalCommunities: communities.length
    };
  }
}

export const eventScrapingScheduler = new EventScrapingScheduler();