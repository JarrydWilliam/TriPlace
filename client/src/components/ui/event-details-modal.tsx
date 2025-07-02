import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Event } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface EventDetailsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailsModal({ event, isOpen, onClose }: EventDetailsModalProps) {
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
      onClose();
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

  if (!event) return null;

  const eventDate = new Date(event.date);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  const isToday = eventDate.toDateString() === new Date().toDateString();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {event.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Event Status Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant={isToday ? "default" : isUpcoming ? "secondary" : "outline"}
              className={`${
                isToday ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                isUpcoming ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {isToday ? 'Today' : isUpcoming ? 'Upcoming' : 'Past Event'}
            </Badge>
            
            {event.price && event.price !== "0" && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                <DollarSign className="w-3 h-3 mr-1" />
                {event.price}
              </Badge>
            )}
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{format(eventDate, 'h:mm a')}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Organized by {event.organizer}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {event.category && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Category</span>
                  <p className="text-foreground">{event.category}</p>
                </div>
              )}
              
              {event.attendeeCount && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Expected Attendees</span>
                  <p className="text-foreground">{event.attendeeCount} people</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
              <p className="text-foreground leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {isPast && (
              <Button 
                onClick={() => {
                  if (user?.id) {
                    markAttendanceMutation.mutate({ eventId: event.id, userId: user.id });
                  }
                }}
                disabled={markAttendanceMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {markAttendanceMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Marking...
                  </>
                ) : (
                  <>
                    ✓ Mark as Attended
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}