import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Event } from "@shared/schema";
import { Calendar, MapPin, Users, Heart, DollarSign, ExternalLink, Check, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { VerificationModal } from "../trust/verification-modal";
import { openExternalUrl } from "@/lib/utils";
import { trackEvent } from "@/lib/telemetry";

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
  const { user } = useAuth();
  const [showVerification, setShowVerification] = useState(false);
  const [showExternalWarning, setShowExternalWarning] = useState(false);
  const [dontShowExternalWarning, setDontShowExternalWarning] = useState(false);

  useEffect(() => {
    setDontShowExternalWarning(localStorage.getItem('samevibe_hide_external_warning') === 'true');
    trackEvent('event_view', { userId: user?.id, eventId: event.id });
  }, []);

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

  const getAttendeeConfidence = (count: number | null) => {
    const num = count || 0;
    if (num < 10) return "Small group";
    if (num < 50) return "Growing group";
    return "Popular event";
  };

  const getLowPressureSignal = () => {
    if (event.category === 'social' && (event.attendeeCount || 0) < 15) return "Great for going solo";
    if (['outdoor', 'wellness'].includes(event.category)) return "Casual crowd";
    return null;
  };

  const isMatchedToVibe = user && user.interests && user.interests.includes(event.category);
  const lowPressureSignal = getLowPressureSignal();

  const handleExternalClick = () => {
    const url = event.externalId?.startsWith('http') 
      ? event.externalId 
      : `https://google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.sourceName || ''))}`;
    
    if (dontShowExternalWarning) {
      trackEvent('external_source_click', { userId: user?.id, eventId: event.id, metadata: { bypassWarning: true } });
      openExternalUrl(url);
    } else {
      trackEvent('external_source_click', { userId: user?.id, eventId: event.id, metadata: { showWarning: true } });
      setShowExternalWarning(true);
    }
  };

  const confirmExternalLink = () => {
    trackEvent('external_source_click', { userId: user?.id, eventId: event.id, metadata: { confirmed: true } });
    if (dontShowExternalWarning) {
      localStorage.setItem('samevibe_hide_external_warning', 'true');
    }
    setShowExternalWarning(false);
    const url = event.externalId?.startsWith('http') 
      ? event.externalId 
      : `https://google.com/search?q=${encodeURIComponent(event.title + ' ' + (event.sourceName || ''))}`;
    openExternalUrl(url);
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
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-lg text-white dark:text-white truncate">
                    {event.title}
                  </h4>
                  {isMatchedToVibe && (
                    <Badge variant="secondary" className="bg-accent/20 text-accent text-[10px] py-0 px-1.5 h-4 hidden sm:flex items-center whitespace-nowrap">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Matched to your vibe
                    </Badge>
                  )}
                </div>
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
                  <span>{getAttendeeConfidence(event.attendeeCount)}</span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {lowPressureSignal && (
                  <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs bg-green-500/10">
                    {lowPressureSignal}
                  </Badge>
                )}
                {/* Verified Attendees Trust Signal */}
                {event.attendeeCount && event.attendeeCount > 0 && !event.externalId && (
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs bg-blue-500/10 hidden sm:inline-flex">
                    Most attendees verified
                  </Badge>
                )}
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
                    
                    trackEvent('rsvp_intent', { userId: user?.id, eventId: event.id, metadata: { needsVerification: !user || user.trustLevel === 0 } });

                    // External link handoff (Scraped events)
                    if (event.externalId && event.sourceName) {
                      handleExternalClick();
                      return;
                    }

                    // Native RSVP Flow with Progressive Trust
                    if (!user || user.trustLevel === 0) {
                      setShowVerification(true);
                      return;
                    }

                    onRegister();
                  }}
                  disabled={loading}
                  className={isRegistered 
                    ? "border-gray-600 text-gray-400 hover:bg-gray-600 hover:text-white dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white" 
                    : "bg-primary hover:bg-primary/90"
                  }
                >
                  {loading 
                    ? "..." 
                    : isRegistered 
                      ? <><Check className="w-4 h-4 mr-1" /> Registered</>
                      : (event.externalId && event.sourceName)
                        ? <><ExternalLink className="w-4 h-4 mr-1" /> View on {event.sourceName}</>
                        : "RSVP"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {user && (
        <VerificationModal 
          isOpen={showVerification}
          onClose={() => setShowVerification(false)}
          userId={user.id}
          onVerified={() => {
            setShowVerification(false);
            if (onRegister) onRegister();
          }}
        />
      )}

      <AlertDialog open={showExternalWarning} onOpenChange={setShowExternalWarning}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>External Link</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 space-y-2">
              <p>You are leaving SameVibe to view this event on <strong className="text-white">{event.sourceName || 'an external site'}</strong>.</p>
              <p className="text-xs">SameVibe is not responsible for external event content or transactions.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center space-x-2 py-4">
            <Checkbox 
              id="dontShowAgain" 
              checked={dontShowExternalWarning}
              onCheckedChange={(checked) => setDontShowExternalWarning(!!checked)}
            />
            <Label htmlFor="dontShowAgain" className="text-sm text-gray-300 font-normal">
              Don't show this again
            </Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 hover:text-white border-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExternalLink} className="bg-primary hover:bg-primary/90">Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
