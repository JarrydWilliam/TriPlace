import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, MapPin, Users, Flame, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface ShortsItem {
  id: string;
  title: string;
  market: string;
  interest: string;
  views: string;
  youtubeUrl: string;
  previewThumbnail: string;
  activeCount: number;
}

const FEATURED_SHORTS: ShortsItem[] = [
  {
    id: "short_1",
    title: "Looking for a Hiking Crew in Salt Lake City?",
    market: "Salt Lake City, UT",
    interest: "Hiking & Outdoors",
    views: "14.2K views",
    youtubeUrl: "https://www.youtube.com/hashtag/shorts",
    previewThumbnail: "https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=800&auto=format&fit=crop",
    activeCount: 17,
  },
  {
    id: "short_2",
    title: "San Francisco Board Game Night Vibe Check",
    market: "San Francisco, CA",
    interest: "Board Games",
    views: "8.9K views",
    youtubeUrl: "https://www.youtube.com/hashtag/shorts",
    previewThumbnail: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=800&auto=format&fit=crop",
    activeCount: 12,
  },
  {
    id: "short_3",
    title: "Ogden Trail Runners Meetup — Zero Pressure Socials",
    market: "Ogden, UT",
    interest: "Trail Running",
    views: "6.4K views",
    youtubeUrl: "https://www.youtube.com/hashtag/shorts",
    previewThumbnail: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?q=80&w=800&auto=format&fit=crop",
    activeCount: 9,
  },
];

export function VibeShortsFeed() {
  const [activeVideo, setActiveVideo] = useState<ShortsItem | null>(null);

  return (
    <Card className="glass-card bg-slate-900/90 border-cyan-500/30 backdrop-blur-xl p-5 space-y-4 rounded-3xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-red-500/30">
            <Flame className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Trending YouTube Shorts
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[10px]">
                🔥 Viral Local Vibe
              </Badge>
            </h3>
            <p className="text-xs text-slate-400">See real activity previews & join local plans in 1-tap</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURED_SHORTS.map((item) => (
          <div
            key={item.id}
            className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-slate-950 transition-all hover:scale-[1.02] hover:border-cyan-400/50"
          >
            <img
              src={item.previewThumbnail}
              alt={item.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[11px] text-white">
              <Users className="w-3 h-3 text-cyan-400" />
              <span>{item.activeCount} looking for crew</span>
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 right-3 space-y-2">
              <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
                <MapPin className="w-3 h-3" />
                {item.market}
              </div>
              <p className="text-xs font-bold text-white line-clamp-2 leading-snug">
                {item.title}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">{item.views}</span>
                <Link href="/discover">
                  <Button size="sm" className="h-7 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3">
                    Join Vibe <Sparkles className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
