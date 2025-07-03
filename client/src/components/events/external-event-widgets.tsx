import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Music, Calendar, MapPin } from 'lucide-react';

interface ExternalEventWidgetsProps {
  location?: string;
  categories?: string[];
}

export function ExternalEventWidgets({ location, categories = [] }: ExternalEventWidgetsProps) {
  const [selectedWidget, setSelectedWidget] = useState<'eventbrite' | 'bandsintown' | 'ticketmaster'>('eventbrite');

  // Generate widget URLs based on user location and interests
  const generateEventbriteUrl = () => {
    const baseUrl = 'https://www.eventbriteapi.com/v3/events/search';
    const params = new URLSearchParams({
      'location.address': location || 'Online',
      'location.within': '50mi',
      'categories': categories.join(','),
      'sort_by': 'date',
      'expand': 'venue'
    });
    return `${baseUrl}?${params}`;
  };

  const generateBandsintownUrl = () => {
    const city = location?.split(',')[0] || 'Online';
    return `https://www.bandsintown.com/c/${encodeURIComponent(city)}`;
  };

  const generateTicketmasterUrl = () => {
    const baseUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const params = new URLSearchParams({
      'city': location?.split(',')[0] || '',
      'radius': '50',
      'unit': 'miles',
      'sort': 'date,asc'
    });
    return `${baseUrl}?${params}`;
  };

  return (
    <div className="space-y-4">
      {/* Widget Selector */}
      <div className="flex space-x-2 mb-4">
        <Button
          variant={selectedWidget === 'eventbrite' ? 'default' : 'outline'}
          onClick={() => setSelectedWidget('eventbrite')}
          className="flex items-center space-x-2"
        >
          <Calendar className="w-4 h-4" />
          <span>Eventbrite</span>
        </Button>
        <Button
          variant={selectedWidget === 'bandsintown' ? 'default' : 'outline'}
          onClick={() => setSelectedWidget('bandsintown')}
          className="flex items-center space-x-2"
        >
          <Music className="w-4 h-4" />
          <span>Bandsintown</span>
        </Button>
        <Button
          variant={selectedWidget === 'ticketmaster' ? 'default' : 'outline'}
          onClick={() => setSelectedWidget('ticketmaster')}
          className="flex items-center space-x-2"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Ticketmaster</span>
        </Button>
      </div>

      {/* External Widget Embeds */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Local Events - {selectedWidget}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                let url = '';
                switch (selectedWidget) {
                  case 'eventbrite':
                    url = `https://www.eventbrite.com/d/${location?.split(',')[0] || 'online'}/events/`;
                    break;
                  case 'bandsintown':
                    url = generateBandsintownUrl();
                    break;
                  case 'ticketmaster':
                    url = `https://www.ticketmaster.com/search?tm_link=tm_homeA_rc_name2&city=${location?.split(',')[0] || ''}`;
                    break;
                }
                window.open(url, '_blank');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedWidget === 'eventbrite' && (
            <EventbriteWidget location={location} categories={categories} />
          )}
          {selectedWidget === 'bandsintown' && (
            <BandsintownWidget location={location} />
          )}
          {selectedWidget === 'ticketmaster' && (
            <TicketmasterWidget location={location} categories={categories} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EventbriteWidget({ location, categories }: { location?: string; categories: string[] }) {
  const city = location?.split(',')[0] || 'online';
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Eventbrite Events</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Discover local events and activities in {location || 'your area'}
        </p>
        
        {/* Simulated event preview */}
        <div className="space-y-2">
          <div className="bg-white dark:bg-gray-600 p-3 rounded border">
            <div className="font-medium text-sm">Loading events near {city}...</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Categories: {categories.join(', ') || 'All'}</div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => window.open(`https://www.eventbrite.com/d/${city}/events/`, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View All Eventbrite Events
        </Button>
      </div>
    </div>
  );
}

function BandsintownWidget({ location }: { location?: string }) {
  const city = location?.split(',')[0] || 'online';
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Live Music Events</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Find concerts and live music events in {location || 'your area'}
        </p>
        
        {/* Simulated concert preview */}
        <div className="space-y-2">
          <div className="bg-white dark:bg-gray-600 p-3 rounded border">
            <div className="font-medium text-sm">🎵 Discovering concerts near {city}...</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">All genres • Within 50 miles</div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => window.open(`https://www.bandsintown.com/c/${encodeURIComponent(city)}`, '_blank')}
        >
          <Music className="w-4 h-4 mr-2" />
          View All Concerts on Bandsintown
        </Button>
      </div>
    </div>
  );
}

function TicketmasterWidget({ location, categories }: { location?: string; categories: string[] }) {
  const city = location?.split(',')[0] || 'online';
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Premium Events</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Sports, concerts, theater and premium events in {location || 'your area'}
        </p>
        
        {/* Simulated event preview */}
        <div className="space-y-2">
          <div className="bg-white dark:bg-gray-600 p-3 rounded border">
            <div className="font-medium text-sm">🎫 Finding premium events in {city}...</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Sports • Concerts • Theater</div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => window.open(`https://www.ticketmaster.com/search?city=${city}`, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View All Ticketmaster Events
        </Button>
      </div>
    </div>
  );
}