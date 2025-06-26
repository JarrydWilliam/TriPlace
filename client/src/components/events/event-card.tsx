import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Event } from "@shared/schema";
import { Calendar, MapPin, Users, Heart, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  event: Event;
  onRegister?: () => void;
  onToggleInterested?: () => void;
  onView?: () => void;
  isInterested?: boolean;
  isRegistered?: boolean;
  loading?: boolean;
}

export function EventCard({ 
  event, 
  onRegister, 
  onToggleInterested,
  onView, 
  isInterested = false,
  isRegistered = false,
  loading = false 
}: EventCardProps) {
  const formatEventDate = (date: Date | string) => {
    const eventDate = new Date(date);
    return format(eventDate, "EEE, MMM d • h:mm a");
  };

  const getPriceDisplay = (price: string | null) => {
    if (!price || price.toLowerCase() === 'free') return 'Free';
    return price;
  };

  const getEventCategories = () => {
    const categories = [event.category];
    if (event.tags && event.tags.length > 0) {
      categories.push(...event.tags.slice(0, 2));
    }
    return categories;
  };

  return (
    <Card 
      className="bg-gray-700 border-gray-600 hover:bg-gray-650 transition-colors cursor-pointer dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-650"
      onClick={onView}
    >
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <div className="w-20 h-20 rounded-xl bg-gray-600 flex-shrink-0 overflow-hidden">
            {event.image ? (
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Calendar className="h-8 w-8" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-lg text-white dark:text-white mb-1 truncate">
                  {event.title}
                </h4>
                <p className="text-gray-400 dark:text-gray-400 text-sm">
                  {event.organizer}
                </p>
              </div>
              
              {onToggleInterested && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleInterested();
                  }}
                  className="text-gray-400 hover:text-accent p-1"
                >
                  <Heart 
                    className={`h-5 w-5 ${isInterested ? 'fill-current text-accent' : ''}`} 
                  />
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 dark:text-gray-400 mb-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatEventDate(event.date)}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="truncate">{event.location}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span className={`font-semibold ${getPriceDisplay(event.price) === 'Free' ? 'text-green-400' : 'text-accent'}`}>
                    {getPriceDisplay(event.price)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-400 dark:text-gray-400">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{event.attendeeCount || 0} going</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {getEventCategories().slice(0, 2).map((category, index) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="bg-primary/20 text-primary text-xs dark:bg-primary/20 dark:text-primary"
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
            
            {onRegister && (
              <div className="mt-3 pt-3 border-t border-gray-600 dark:border-gray-600">
                <Button
                  size="sm"
                  variant={isRegistered ? "outline" : "default"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegister();
                  }}
                  disabled={loading}
                  className={isRegistered 
                    ? "border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white" 
                    : "bg-primary hover:bg-primary/90"
                  }
                >
                  {loading ? "..." : (isRegistered ? "Registered" : "Register")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
