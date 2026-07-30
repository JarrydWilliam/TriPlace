import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { VibePageHeader } from "@/components/layout/vibe-page-header";
import { VibeEventCard, VibeEventAttendee } from "@/components/ui/vibe-event-card";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ComponentLoadingSpinner } from "@/components/loading-spinner";
import { Calendar } from "lucide-react";

export default function Events() {
  const { user } = useAuth();

  const { data: upcomingEvents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/events/upcoming", user?.id],
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground safe-area-bottom pb-nav relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent/10 blur-[130px]" />
      </div>

      <VibePageHeader mode="home" locationName="NYC" unreadCount={6} />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-cyan-400" />
              Upcoming Events
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Explore activities and community meetups happening near you
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <ComponentLoadingSpinner />
          </div>
        ) : upcomingEvents && upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {upcomingEvents.map((evt) => (
              <VibeEventCard
                key={evt.id}
                id={evt.id}
                title={evt.title}
                category={evt.category}
                date={evt.date ? new Date(evt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Upcoming"}
                time={evt.date ? new Date(evt.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "6 PM"}
                location={evt.location || "NYC"}
                imageUrl={evt.imageUrl || "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"}
                attendeeCount={evt.attendeeCount || 12}
                attendees={evt.attendees || []}
                actionLabel="Explore"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 p-8 text-center space-y-3">
            <Calendar className="w-10 h-10 text-white/20 mx-auto" />
            <h3 className="font-display font-bold text-white text-base">No upcoming events</h3>
            <p className="text-xs text-white/50 max-w-xs mx-auto">
              Check back soon or explore communities to see new events!
            </p>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
