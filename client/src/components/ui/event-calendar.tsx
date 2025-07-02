import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Event } from "@shared/schema";

interface EventCalendarProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: number; userId: number }) => {
      const response = await fetch(`/api/events/${eventId}/mark-attended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, attended: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark attendance');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance Marked",
        description: "Thanks for confirming your attendance! Your community activity has been updated.",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events"] });
    },
    onError: (error) => {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No joined events</p>
        <p className="text-sm">Join events from your communities to see them here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toISOString()}
              className={`p-2 min-h-[80px] border border-border rounded-md ${
                !isCurrentMonth ? 'opacity-50 bg-muted/20' : 'bg-background'
              } ${isToday ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="text-sm font-medium mb-1">
                {format(day, 'd')}
              </div>
              
              {/* Event indicators */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors truncate"
                    title={`${event.title} at ${event.location}`}
                    onClick={() => onEventClick?.(event)}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
}