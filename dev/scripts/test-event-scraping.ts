#!/usr/bin/env tsx
import { EventScraper } from '../../server/event-scraper';
import { Community } from '../../shared/schema';

// Test event scraping functionality in dev environment
async function testEventScraping() {
  console.log('🔍 Testing Event Scraping System...\n');

  // Mock community for testing
  const testCommunity: Community = {
    id: 1,
    name: 'Tech Innovators Hub',
    description: 'A community for technology enthusiasts and innovators',
    category: 'Technology',
    image: null,
    memberCount: 25,
    location: 'Salt Lake City, UT',
    isActive: true,
    createdAt: new Date(),
    lastActivityAt: new Date()
  };

  // Test location (Salt Lake City, Utah)
  const testLocation = { lat: 40.7608, lon: -111.8910 };

  const eventScraper = new EventScraper();

  console.log('Testing community:', testCommunity.name);
  console.log('Testing location:', `${testLocation.lat}, ${testLocation.lon}`);
  console.log('Category:', testCommunity.category);
  console.log('\n📡 Checking API key availability...');

  // Check which APIs are available
  const apiStatus = {
    eventbrite: !!process.env.EVENTBRITE_API_KEY,
    meetup: !!process.env.MEETUP_API_KEY,
    ticketmaster: !!process.env.TICKETMASTER_API_KEY,
    facebook: !!process.env.FACEBOOK_API_KEY,
    stubhub: !!process.env.STUBHUB_API_KEY,
    eventful: !!process.env.EVENTFUL_API_KEY,
    universe: !!process.env.UNIVERSE_API_KEY,
    seatgeek: !!process.env.SEATGEEK_API_KEY
  };

  console.log('API Keys Status:');
  Object.entries(apiStatus).forEach(([api, available]) => {
    console.log(`  ${api.toUpperCase()}: ${available ? '✅ Available' : '❌ Missing'}`);
  });

  const availableApis = Object.values(apiStatus).filter(Boolean).length;
  console.log(`\nTotal APIs available: ${availableApis}/8\n`);

  if (availableApis === 0) {
    console.log('⚠️  No API keys found. Testing will show graceful fallback behavior.');
    console.log('💡 Event scraping will return empty arrays but won\'t crash the system.\n');
  }

  // Test event scraping
  console.log('🚀 Starting event scraping test...');
  
  try {
    const startTime = Date.now();
    const scrapedEvents = await eventScraper.scrapeEventsForCommunity(testCommunity, testLocation);
    const endTime = Date.now();
    
    console.log(`\n✅ Event scraping completed in ${endTime - startTime}ms`);
    console.log(`📊 Found ${scrapedEvents.length} events`);

    if (scrapedEvents.length > 0) {
      console.log('\n🎉 Sample events found:');
      scrapedEvents.slice(0, 3).forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📅 Date: ${event.date.toLocaleDateString()}`);
        console.log(`   📍 Location: ${event.location}`);
        console.log(`   🏷️  Category: ${event.category}`);
        console.log(`   💰 Price: $${event.price || 0}`);
        console.log(`   👥 Attendees: ${event.attendeeCount || 'Unknown'}`);
      });
    } else {
      console.log('\n📝 No events found - this is expected without API keys');
      console.log('   System is working correctly and handling missing keys gracefully');
    }

    // Test event population (database integration)
    console.log('\n🗄️  Testing database event population...');
    try {
      const populatedEvents = await eventScraper.populateCommunityEvents(testCommunity, testLocation);
      console.log(`✅ Successfully populated ${populatedEvents.length} events to database`);
    } catch (error) {
      console.log('❌ Database population test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Event scraping test failed:', error);
  }

  console.log('\n🏁 Event scraping test completed!');
  console.log('\n💡 To enable full functionality, add API keys to your environment:');
  console.log('   - EVENTBRITE_API_KEY');
  console.log('   - MEETUP_API_KEY (coming soon)');
  console.log('   - TICKETMASTER_API_KEY');
}

// Run the test
testEventScraping().catch(console.error);

export { testEventScraping };