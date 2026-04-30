import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PostEventModal } from "./post-event-modal";
import { Event } from "@shared/schema";

export function PostEventFlow() {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { data: userEvents = [] } = useQuery<Event[]>({
    queryKey: ["/api/users", user?.id, "events"],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!userEvents || userEvents.length === 0) return;

    // MVP Logic: Find the first event that is in the past, within the last 48 hours.
    // In a real app, we'd also check the `eventReviews` table to see if they already reviewed it.
    // For now, if we find a past event, we show it once per session.
    const hasSeenReviewModal = sessionStorage.getItem("hasSeenReviewModal");
    if (hasSeenReviewModal) return;

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const recentPastEvent = userEvents.find((e) => {
      const eventDate = new Date(e.date);
      return eventDate < now && eventDate > fortyEightHoursAgo;
    });

    if (recentPastEvent) {
      const reminderCount = parseInt(localStorage.getItem(`postEventModalReminders_${recentPastEvent.id}`) || "0");
      const isSkipped = localStorage.getItem(`postEventModalSkipped_${recentPastEvent.id}`) === "true";

      if (reminderCount >= 2 || isSkipped) return;

      setSelectedEvent(recentPastEvent);
      sessionStorage.setItem("hasSeenReviewModal", "true");
    }
  }, [userEvents]);

  if (!user || !selectedEvent) return null;

  return (
    <PostEventModal
      isOpen={!!selectedEvent}
      onClose={() => setSelectedEvent(null)}
      onRemindLater={() => {
        const count = parseInt(localStorage.getItem(`postEventModalReminders_${selectedEvent.id}`) || "0");
        localStorage.setItem(`postEventModalReminders_${selectedEvent.id}`, (count + 1).toString());
        setSelectedEvent(null);
      }}
      onSkip={() => {
        localStorage.setItem(`postEventModalSkipped_${selectedEvent.id}`, "true");
        setSelectedEvent(null);
      }}
      userId={user.id}
      eventId={selectedEvent.id}
      eventTitle={selectedEvent.title}
    />
  );
}
