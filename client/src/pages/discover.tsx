/**
 * /discover — TriPlace discovery experience
 *
 * The "Familiar but New" space. Feels like a social feed (familiar)
 * but the discovery mechanism is spatial/AI-driven (new).
 *
 * Three sections:
 *  1. "Near you now" — live map pulse showing active community hotspots
 *  2. "For you" — AI-curated community cards to explore and join
 *  3. "What's happening" — upcoming events filtered to user location
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sparkles, MapPin, Users, Calendar, ChevronRight, Plus, Check, Zap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Community, Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Category pill config ─────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",      label: "For You",   icon: "✨" },
  { id: "tech",     label: "Tech",      icon: "🤖" },
  { id: "wellness", label: "Wellness",  icon: "🧘" },
  { id: "outdoor",  label: "Outdoor",   icon: "🌲" },
  { id: "arts",     label: "Arts",      icon: "🎨" },
  { id: "food",     label: "Food",      icon: "🍳" },
  { id: "music",    label: "Music",     icon: "🎵" },
  { id: "social",   label: "Social",    icon: "🤝" },
];

const categoryColor: Record<string, { gradient: string; badge: string; dot: string }> = {
  tech:     { gradient: "from-cyan-500/20 to-blue-600/20",    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",    dot: "bg-cyan-400" },
  wellness: { gradient: "from-violet-500/20 to-purple-600/20", badge: "bg-violet-500/15 text-violet-300 border-violet-500/20", dot: "bg-violet-400" },
  outdoor:  { gradient: "from-emerald-500/20 to-teal-600/20", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", dot: "bg-emerald-400" },
  arts:     { gradient: "from-pink-500/20 to-fuchsia-600/20", badge: "bg-pink-500/15 text-pink-300 border-pink-500/20",    dot: "bg-pink-400" },
  food:     { gradient: "from-orange-500/20 to-amber-600/20", badge: "bg-orange-500/15 text-orange-300 border-orange-500/20", dot: "bg-orange-400" },
  music:    { gradient: "from-indigo-500/20 to-purple-600/20", badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20", dot: "bg-indigo-400" },
  social:   { gradient: "from-rose-500/20 to-red-600/20",     badge: "bg-rose-500/15 text-rose-300 border-rose-500/20",    dot: "bg-rose-400" },
  fitness:  { gradient: "from-green-500/20 to-lime-600/20",   badge: "bg-green-500/15 text-green-300 border-green-500/20",  dot: "bg-green-400" },
};

const defaultColors = { gradient: "from-primary/20 to-accent/20", badge: "bg-primary/15 text-primary border-primary/20", dot: "bg-primary" };

// ─── Community card ───────────────────────────────────────────────────────────

function CommunityCard({ community, joined, onJoin, joining }: {
  community: Community;
  joined: boolean;
  onJoin: (id: number) => void;
  joining: boolean;
}) {
  const colors = categoryColor[community.category] ?? defaultColors;
  const emoji: Record<string, string> = {
    tech: "🤖", wellness: "🧘", outdoor: "🌲", arts: "🎨",
    food: "🍳", music: "🎵", social: "🤝", fitness: "💪",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-br ${colors.gradient} p-5`}
    >
      {/* Live activity dot */}
      {(community.memberCount ?? 0) > 0 && (
        <span className={`absolute top-4 right-4 flex h-2 w-2`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-60`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`} />
        </span>
      )}

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
          {emoji[community.category] ?? "✨"}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-sm leading-tight">{community.name}</h3>
            <Badge className={`text-[10px] px-1.5 py-0.5 border ${colors.badge} font-normal`}>
              {community.category}
            </Badge>
          </div>
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">{community.description}</p>
          <div className="flex items-center gap-3 text-[11px] text-white/30 pt-0.5">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{community.memberCount ?? 0}</span>
            {community.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{community.location}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Link href={`/community/${community.id}`} className="flex-1">
          <Button size="sm" variant="ghost" className="w-full text-white/60 hover:text-white hover:bg-white/10 text-xs h-8">
            View
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={() => onJoin(community.id)}
          disabled={joining || joined}
          className={`flex-1 text-xs h-8 transition-all ${
            joined
              ? "bg-white/10 text-white/60 cursor-default"
              : "bg-white/15 hover:bg-white/25 text-white"
          }`}
        >
          {joined ? (
            <><Check className="w-3 h-3 mr-1" /> Joined</>
          ) : joining ? (
            "Joining..."
          ) : (
            <><Plus className="w-3 h-3 mr-1" /> Join</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Discover page ───────────────────────────────────────────────────────

export default function Discover() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [joiningId, setJoiningId] = useState<number | null>(null);

  // Recommended communities
  const { data: recommended = [], isLoading: loadingCommunities } = useQuery<Community[]>({
    queryKey: ["/api/communities/recommended", user?.id, selectedCategory],
    enabled: !!user?.id,
    queryFn: async () => {
      const params = new URLSearchParams({ userId: String(user?.id), latitude: user?.latitude ?? "", longitude: user?.longitude ?? "" });
      const res = await fetch(`/api/communities/recommended?${params}`);
      return res.ok ? res.json() : [];
    },
  });

  // User's current communities (to mark joined state)
  const { data: myCommunities = [] } = useQuery<Community[]>({
    queryKey: ["/api/users", user?.id, "communities"],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/communities`);
      return res.ok ? res.json() : [];
    },
  });

  // Upcoming events near user
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events/upcoming", user?.id],
    queryFn: async () => {
      const url = user?.id ? `/api/events/upcoming?userId=${user.id}` : `/api/events/upcoming`;
      const res = await fetch(url);
      return res.ok ? res.json() : [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (communityId: number) => {
      return apiRequest("POST", `/api/communities/${communityId}/join`, { userId: user?.id });
    },
    onSuccess: (_, communityId) => {
      qc.invalidateQueries({ queryKey: ["/api/users", user?.id, "communities"] });
      toast({ title: "You're in! 🎉", description: "Community joined." });
    },
    onError: () => {
      toast({ title: "Couldn't join", description: "Please try again.", variant: "destructive" });
    },
  });

  const joinedIds = new Set((myCommunities).map((c: Community) => c.id));

  const filteredCommunities = selectedCategory === "all"
    ? recommended
    : recommended.filter((c) => c.category === selectedCategory);

  const upcomingEvents = events
    .filter((e) => {
      if (e.expiresAt && new Date(e.expiresAt) < new Date()) return false;
      return true;
    })
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ─ Header ─ */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50 px-4 pt-safe">
        <div className="max-w-lg mx-auto py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Discover</p>
              <h1 className="text-xl font-bold text-foreground">Find your people</h1>
            </div>
            <div className="flex items-center gap-1.5 text-primary">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">AI-matched</span>
            </div>
          </div>

          {/* Category filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* ─ AI Communities ─ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {selectedCategory === "all" ? "Matched for you" : CATEGORIES.find(c => c.id === selectedCategory)?.label}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">{filteredCommunities.length} found</span>
          </div>

          {loadingCommunities ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : filteredCommunities.length > 0 ? (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {filteredCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    joined={joinedIds.has(community.id)}
                    joining={joiningId === community.id && joinMutation.isPending}
                    onJoin={async (id) => {
                      setJoiningId(id);
                      await joinMutation.mutateAsync(id);
                      setJoiningId(null);
                    }}
                  />
                ))}
              </div>
            </AnimatePresence>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-4xl">🔭</p>
              <p className="text-sm text-muted-foreground">No communities found for this category yet.</p>
              <p className="text-xs text-muted-foreground/60">As more people join TriPlace, new ones will appear here.</p>
            </div>
          )}
        </section>

        {/* ─ Upcoming Events ─ */}
        {upcomingEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">What's happening</h2>
              </div>
              <Link href="/events">
                <span className="text-xs text-primary hover:underline">See all</span>
              </Link>
            </div>
            <div className="space-y-2.5">
              {upcomingEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => {
                    // Always send to original source — no in-app ticketing
                    if (event.sourceUrl) {
                      window.open(event.sourceUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {event.category === "tech" ? "💻" : event.category === "wellness" ? "🧘" : event.category === "outdoor" ? "🌲" : "🎉"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.date ? new Date(event.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "TBD"}
                      {event.location && ` · ${event.location}`}
                    </p>
                    {event.sourceAttribution && (
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">via {event.sourceAttribution}</p>
                    )}
                  </div>
                  {event.sourceUrl ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  ) : null}
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
