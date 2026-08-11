import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock, Users, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Event } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/queryClient";

import { formatEventDateTime } from "@/lib/date-utils";

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
      const response = await fetch(getApiUrl(`/api/events/${eventId}/mark-attended`), {
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
  const { fullDateStr, timeStr } = formatEventDateTime(event.date, (event as any).time, (event as any).timezone);
  const isUpcoming = eventDate > new Date();
  const isPast = eventDate < new Date();
  const isToday = eventDate.toDateString() === new Date().toDateString();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0b172a] border-cyan-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {event.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Event Status Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              variant={isToday ? "default" : isUpcoming ? "secondary" : "outline"}
              className={`${
                isToday ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                isUpcoming ? 'bg-green-500/20 text-green-300 border border-green-500/40' :
                'bg-gray-800 text-gray-300 border border-gray-700'
              }`}
            >
              {isToday ? 'Today' : isUpcoming ? 'Upcoming' : 'Past Event'}
            </Badge>
            
            {event.price && event.price !== "0" && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <DollarSign className="w-3 h-3 mr-1" />
                {event.price}
              </Badge>
            )}
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-cyan-200/80">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                <span>{fullDateStr}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-cyan-200/80">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{timeStr}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-cyan-200/80">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{event.location}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-cyan-200/80">
                <Users className="w-4 h-4 text-cyan-400" />
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
