/**
 * /events — SameVibe Events Discovery Page
 *
 * Features:
 *  - Category filter pills (All, Music, Sports, Arts, Food, Tech, Wellness, Community...)
 *  - Date range toggles (Today / This Week / This Month / All)
 *  - Featured Events hero section (promoted or highest-attended)
 *  - Full event list with client-side filtering
 *  - Native Web Share API share button per card
 *  - Submit an Event CTA
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { VibePageHeader } from "@/components/layout/vibe-page-header";
import { VibeEventCard } from "@/components/ui/vibe-event-card";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ComponentLoadingSpinner } from "@/components/loading-spinner";
import { getApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  Share2,
  Star,
  Sparkles,
  Music,
  Dumbbell,
  Palette,
  Coffee,
  Laptop,
  Heart,
  Users,
  Utensils,
  Globe,
} from "lucide-react";

// ─── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: <Globe className="w-3.5 h-3.5" /> },
  { id: "music", label: "Music", icon: <Music className="w-3.5 h-3.5" /> },
  { id: "sports", label: "Sports", icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { id: "arts", label: "Arts", icon: <Palette className="w-3.5 h-3.5" /> },
  { id: "food", label: "Food & Drink", icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: "tech", label: "Tech", icon: <Laptop className="w-3.5 h-3.5" /> },
  { id: "wellness", label: "Wellness", icon: <Heart className="w-3.5 h-3.5" /> },
  { id: "community", label: "Community", icon: <Users className="w-3.5 h-3.5" /> },
  { id: "social", label: "Social", icon: <Coffee className="w-3.5 h-3.5" /> },
];

// Category keyword map for client-side matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  music: ["music", "concert", "band", "dj", "live", "jazz", "hip-hop", "rap", "pop", "rock", "festival"],
  sports: ["sport", "fitness", "run", "yoga", "gym", "marathon", "soccer", "basketball", "tennis", "golf", "cycling", "hike"],
  arts: ["art", "paint", "gallery", "exhibit", "film", "theatre", "dance", "craft", "museum", "culture", "improv", "comedy"],
  food: ["food", "drink", "wine", "beer", "cocktail", "brunch", "dinner", "tasting", "restaurant", "chef", "cooking", "bake"],
  tech: ["tech", "startup", "coding", "developer", "ai", "hack", "product", "design", "data", "science"],
  wellness: ["wellness", "mental", "health", "meditation", "mindful", "yoga", "self-care", "therapy", "nature", "spa"],
  community: ["community", "volunteer", "charity", "civic", "neighborhood", "local", "cultural", "diversity", "meeting"],
  social: ["social", "networking", "meetup", "mixer", "party", "game night", "trivia", "karaoke"],
};

// Date range definitions
const DATE_RANGES = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
];

function matchesCategory(event: any, category: string): boolean {
  if (category === "all") return true;
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  const haystack = `${event.title ?? ""} ${event.category ?? ""} ${event.description ?? ""}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

function matchesDateRange(event: any, range: string): boolean {
  if (range === "all") return true;
  const eventDate = event.date ? new Date(event.date) : null;
  if (!eventDate) return false;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  if (range === "today") return eventDate <= todayEnd;
  if (range === "week") return eventDate <= weekEnd;
  if (range === "month") return eventDate <= monthEnd;
  return true;
}

// ─── Share helper ─────────────────────────────────────────────────────────────
async function shareEvent(event: any, toast: ReturnType<typeof useToast>["toast"]) {
  const shareData = {
    title: event.title ?? "SameVibe Event",
    text: `Check out this event: ${event.title}`,
    url: event.sourceUrl ?? `${window.location.origin}/events`,
  };
  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast({ title: "Link copied!", description: "Event link copied to clipboard." });
    }
  } catch {
    // User cancelled share or clipboard failed silently
  }
}

// ─── Featured event card ──────────────────────────────────────────────────────
function FeaturedEventCard({ event, onShare }: { event: any; onShare: () => void }) {
  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "Upcoming";
  const timeStr = event.date
    ? new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-primary/20 via-card/60 to-cyan-900/20 backdrop-blur-xl">
      {/* Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 text-white text-[10px] font-bold uppercase tracking-wider">
        <Star className="w-3 h-3 fill-white" />
        Featured
      </div>
      {/* Share */}
      <button
        onClick={onShare}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
        aria-label="Share event"
      >
        <Share2 className="w-3.5 h-3.5 text-white" />
      </button>
      {/* Image */}
      {event.image && (
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-36 object-cover opacity-60"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {!event.image && (
        <div className="w-full h-32 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary/40" />
        </div>
      )}
      {/* Content */}
      <div className="px-4 pb-4 pt-2 space-y-1">
        <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">{event.title}</h3>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateStr}{timeStr && ` · ${timeStr}`}
          </span>
        </div>
        <p className="text-xs text-white/50 line-clamp-2 pt-0.5">{event.location}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/70">
            {event.category ?? "Event"}
          </span>
          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 font-semibold hover:underline"
            >
              Get Tickets →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Events() {
  const { user } = useAuth();
  const { latitude, longitude } = useGeolocation(user?.id);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRange, setSelectedRange] = useState("all");

  const { data: upcomingEvents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events/upcoming", user?.id, latitude, longitude],
    enabled: true,
    queryFn: async () => {
      let url = `/api/events/upcoming?radius=50`;
      if (user?.id) {
        url += `&userId=${user.id}`;
      }
      if (latitude && longitude) {
        url += `&latitude=${latitude}&longitude=${longitude}`;
      }
      const res = await fetch(getApiUrl(url));
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Featured: isPromoted first, then top 2 by attendeeCount
  const featured = useMemo(() => {
    const sorted = [...upcomingEvents].sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      return (b.attendeeCount ?? 0) - (a.attendeeCount ?? 0);
    });
    return sorted.slice(0, 2);
  }, [upcomingEvents]);

  // Filtered list (excludes featured to avoid duplication)
  const filteredEvents = useMemo(() => {
    const featuredIds = new Set(featured.map((e) => e.id));
    return upcomingEvents.filter(
      (e) =>
        !featuredIds.has(e.id) &&
        matchesCategory(e, selectedCategory) &&
        matchesDateRange(e, selectedRange)
    );
  }, [upcomingEvents, featured, selectedCategory, selectedRange]);

  const hasActiveFilter = selectedCategory !== "all" || selectedRange !== "all";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground safe-area-bottom pb-nav relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-accent/10 blur-[130px]" />
      </div>

      <VibePageHeader mode="home" />

      <main className="max-w-md mx-auto px-4 pt-6 pb-32 space-y-5">

        {/* ── Header row ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-cyan-400" />
              Upcoming Events
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Activities and meetups happening near you
            </p>
          </div>
          <button
            id="submit-event-cta"
            onClick={() => setLocation("/submit-event")}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>

        {/* ── Date range toggles ──────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {DATE_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedRange === range.id
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* ── Category pills ─────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <ComponentLoadingSpinner />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 p-8 text-center space-y-3">
            <Calendar className="w-10 h-10 text-white/20 mx-auto" />
            <h3 className="font-display font-bold text-white text-base">No upcoming events</h3>
            <p className="text-xs text-white/50 max-w-xs mx-auto">
              Check back soon or explore communities to see new events!
            </p>
            <button
              onClick={() => setLocation("/submit-event")}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Submit an Event
            </button>
          </div>
        ) : (
          <>
            {/* ── Featured section ─────────────────────────────── */}
            {featured.length > 0 && !hasActiveFilter && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">Featured</h2>
                </div>
                <div className="space-y-3">
                  {featured.map((event) => (
                    <FeaturedEventCard
                      key={event.id}
                      event={event}
                      onShare={() => shareEvent(event, toast)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── All Events section ───────────────────────────── */}
            {filteredEvents.length > 0 ? (
              <section className="space-y-3">
                {!hasActiveFilter && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">All Events</h2>
                  </div>
                )}
                <AnimatePresence>
                  <div className="grid grid-cols-1 gap-4">
                    {filteredEvents.map((evt) => (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="relative"
                      >
                        {/* Share button overlay */}
                        <button
                          onClick={() => shareEvent(evt, toast)}
                          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
                          aria-label="Share event"
                        >
                          <Share2 className="w-3 h-3 text-white/70" />
                        </button>
                        <VibeEventCard
                          id={evt.id}
                          title={evt.title}
                          category={evt.category}
                          date={evt.date ? new Date(evt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Upcoming"}
                          time={evt.date ? new Date(evt.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
                          location={evt.location || "Local"}
                          imageUrl={evt.image ?? evt.imageUrl ?? "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80"}
                          attendeeCount={evt.attendeeCount ?? 0}
                          attendees={evt.attendees ?? []}
                          actionLabel="Explore"
                        />
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </section>
            ) : hasActiveFilter ? (
              <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 p-8 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-sm font-semibold text-white">No events match your filters</p>
                <button
                  onClick={() => { setSelectedCategory("all"); setSelectedRange("all"); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </>
        )}

        {/* ── Submit CTA banner ─────────────────────────────────── */}
        {!isLoading && upcomingEvents.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-cyan-900/10 border border-primary/20 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Know about a local event?</p>
              <p className="text-xs text-white/50">Share it with the community</p>
            </div>
            <button
              onClick={() => setLocation("/submit-event")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
