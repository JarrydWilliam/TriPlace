/**
 * Database Cleanup Script for Development
 * Clears all development and test data from the database
 */

import { db } from '../../server/db';
import { 
  users, 
  communities, 
  events, 
  communityMembers, 
  messages, 
  communityMessages,
  eventAttendees,
  kudos,
  activityFeed,
  messageResonates
} from '../../shared/schema';
import { devLogger } from '../utils/debug';

export class DatabaseCleaner {
  async clearAll() {
    devLogger.info('Starting database cleanup...');
    
    try {
      await this.clearAllTables();
      devLogger.success('Database cleanup completed successfully');
    } catch (error) {
      devLogger.error('Database cleanup failed', error);
      throw error;
    }
  }

  async clearTestData() {
    devLogger.info('Clearing test data only...');
    
    try {
      // Clear only test/dev data (users with dev- prefix)
      const testUsers = await db.select().from(users).where(sql`firebase_uid LIKE 'dev-%'`);
      const testUserIds = testUsers.map(u => u.id);
      
      if (testUserIds.length > 0) {
        // Clear related data for test users
        await db.delete(messageResonates).where(sql`user_id IN (${testUserIds.join(',')})`);
        await db.delete(activityFeed).where(sql`user_id IN (${testUserIds.join(',')})`);
        await db.delete(kudos).where(sql`giver_id IN (${testUserIds.join(',')}) OR receiver_id IN (${testUserIds.join(',')})`);
        await db.delete(eventAttendees).where(sql`user_id IN (${testUserIds.join(',')})`);
        await db.delete(messages).where(sql`sender_id IN (${testUserIds.join(',')}) OR receiver_id IN (${testUserIds.join(',')})`);
        await db.delete(communityMessages).where(sql`sender_id IN (${testUserIds.join(',')})`);
        await db.delete(communityMembers).where(sql`user_id IN (${testUserIds.join(',')})`);
        await db.delete(users).where(sql`firebase_uid LIKE 'dev-%'`);
        
        devLogger.success(`Cleared ${testUsers.length} test users and related data`);
      } else {
        devLogger.info('No test data found');
      }
    } catch (error) {
      devLogger.error('Test data cleanup failed', error);
      throw error;
    }
  }

  private async clearAllTables() {
    devLogger.info('Clearing all database tables...');
    
    const tables = [
      { name: 'messageResonates', table: messageResonates },
      { name: 'activityFeed', table: activityFeed },
      { name: 'kudos', table: kudos },
      { name: 'eventAttendees', table: eventAttendees },
      { name: 'messages', table: messages },
      { name: 'communityMessages', table: communityMessages },
      { name: 'communityMembers', table: communityMembers },
      { name: 'events', table: events },
      { name: 'communities', table: communities },
      { name: 'users', table: users },
    ];

    for (const { name, table } of tables) {
      try {
        const result = await db.delete(table);
        devLogger.info(`Cleared ${name} table`);
      } catch (error) {
        devLogger.warn(`Failed to clear ${name} table:`, error);
      }
    }
  }

  async clearUserData(userId: number) {
    devLogger.info(`Clearing data for user ${userId}...`);
    
    try {
      // Clear user-specific data in dependency order
      await db.delete(messageResonates).where(eq(messageResonates.userId, userId));
      await db.delete(activityFeed).where(eq(activityFeed.userId, userId));
      await db.delete(kudos).where(or(
        eq(kudos.giverId, userId),
        eq(kudos.receiverId, userId)
      ));
      await db.delete(eventAttendees).where(eq(eventAttendees.userId, userId));
      await db.delete(messages).where(or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      ));
      await db.delete(communityMessages).where(eq(communityMessages.senderId, userId));
      await db.delete(communityMembers).where(eq(communityMembers.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      
      devLogger.success(`Cleared all data for user ${userId}`);
    } catch (error) {
      devLogger.error(`Failed to clear user ${userId} data`, error);
      throw error;
    }
  }

  async clearCommunityData(communityId: number) {
    devLogger.info(`Clearing data for community ${communityId}...`);
    
    try {
      // Clear community-specific data
      await db.delete(communityMessages).where(eq(communityMessages.communityId, communityId));
      await db.delete(events).where(eq(events.communityId, communityId));
      await db.delete(communityMembers).where(eq(communityMembers.communityId, communityId));
      await db.delete(communities).where(eq(communities.id, communityId));
      
      devLogger.success(`Cleared all data for community ${communityId}`);
    } catch (error) {
      devLogger.error(`Failed to clear community ${communityId} data`, error);
      throw error;
    }
  }

  async getTableCounts() {
    devLogger.info('Getting table row counts...');
    
    const counts = {
      users: await db.select({ count: sql`COUNT(*)` }).from(users),
      communities: await db.select({ count: sql`COUNT(*)` }).from(communities),
      events: await db.select({ count: sql`COUNT(*)` }).from(events),
      communityMembers: await db.select({ count: sql`COUNT(*)` }).from(communityMembers),
      messages: await db.select({ count: sql`COUNT(*)` }).from(messages),
      communityMessages: await db.select({ count: sql`COUNT(*)` }).from(communityMessages),
    };
    
    devLogger.info('Current table counts:', counts);
    return counts;
  }
}

// Export cleanup functions
export async function clearDatabase() {
  const cleaner = new DatabaseCleaner();
  await cleaner.clearAll();
}

export async function clearTestData() {
  const cleaner = new DatabaseCleaner();
  await cleaner.clearTestData();
}

export async function showTableCounts() {
  const cleaner = new DatabaseCleaner();
  return await cleaner.getTableCounts();
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2] || 'all';
  
  const executeCommand = async () => {
    const cleaner = new DatabaseCleaner();
    
    switch (command) {
      case 'all':
        await cleaner.clearAll();
        break;
      case 'test':
        await cleaner.clearTestData();
        break;
      case 'counts':
        await cleaner.getTableCounts();
        break;
      default:
        devLogger.warn(`Unknown command: ${command}`);
        devLogger.info('Available commands: all, test, counts');
        process.exit(1);
    }
  };
  
  executeCommand()
    .then(() => {
      devLogger.success('Database cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      devLogger.error('Database cleanup script failed', error);
      process.exit(1);
    });
}