import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/telemetry";
import { useEffect } from "react";

interface PostEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRemindLater?: () => void;
  onSkip?: () => void;
  userId: number;
  eventId: number;
  eventTitle: string;
}

export function PostEventModal({ isOpen, onClose, onRemindLater, onSkip, userId, eventId, eventTitle }: PostEventModalProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feltSafe, setFeltSafe] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (isOpen) {
      trackEvent('post_event_review_opened', { userId, eventId });
    }
  }, [isOpen, userId, eventId]);

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${eventId}/review`, {
        userId,
        rating,
        feltSafe,
        feedback,
      });
      return response.json();
    },
    onSuccess: () => {
      trackEvent('post_event_review_completed', { 
        userId, 
        eventId, 
        metadata: { rating, feltSafe, hasFeedback: !!feedback } 
      });
      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping keep TriPlace safe and high quality!",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a star rating.",
        variant: "destructive",
      });
      return;
    }
    submitReviewMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">How was your event?</DialogTitle>
          <DialogDescription className="text-gray-400">
            You recently attended <strong className="text-white">{eventTitle}</strong>. 
            Your feedback strictly tunes your AI recommendations and keeps the community safe.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <Label className="text-sm text-gray-300">Rate your experience</Label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 ${(hoveredRating || rating) >= star ? "fill-accent text-accent" : "text-gray-600"}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="space-y-0.5">
              <Label htmlFor="safety-toggle" className="text-base text-white">I felt safe at this event</Label>
              <p className="text-xs text-gray-400">
                If no, we will review the organizer.
              </p>
            </div>
            <Switch
              id="safety-toggle"
              checked={feltSafe}
              onCheckedChange={setFeltSafe}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-sm text-gray-300">Any additional feedback? (Optional)</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what you loved or what could be better..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (onSkip) onSkip();
                else onClose();
              }}
              disabled={submitReviewMutation.isPending}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              Skip
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (onRemindLater) onRemindLater();
                else onClose();
              }}
              disabled={submitReviewMutation.isPending}
              className="text-gray-400 hover:text-white"
            >
              Remind me later
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitReviewMutation.isPending || rating === 0}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {submitReviewMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
