import { MeetupScraper } from './server/scrapers/meetupScraper.js';

async function run() {
  const scraper = new MeetupScraper();
  console.log("Running scraper for keyword: hiking");
  const events = await scraper.scrapeEvents("hiking", "New York");
  console.log("Scraped events:", events.length);
  if (events.length > 0) {
    console.log(events[0]);
  }
}

run().catch(console.error);
