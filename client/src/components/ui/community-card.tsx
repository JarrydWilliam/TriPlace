import { motion } from "framer-motion";
import { Users, MapPin, ChevronRight, Plus, Check } from "lucide-react";
import { Link } from "wouter";
import { Community } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryMeta } from "@/lib/constants";

interface CommunityCardProps {
  community: Community;
  joined: boolean;
  onJoin: (id: number) => void;
  joining?: boolean;
}

function formatLocationDisplay(loc?: string | null): string {
  if (!loc || loc.trim() === "" || loc === "Virtual") return "Virtual";
  if (loc.includes(",")) {
    const parts = loc.split(",");
    // If raw coordinates like "37.7749,-122.419", display "Local"
    if (!isNaN(Number(parts[0].trim())) && !isNaN(Number(parts[1].trim()))) {
      return "Local";
    }
  }
  return loc;
}

export function SharedCommunityCard({ community, joined, onJoin, joining = false }: CommunityCardProps) {
  const meta = getCategoryMeta(community.category);
  const hasCustomImage = typeof community.image === "string" && community.image.trim().length > 5 && !community.image.includes("example.com");
  const bgImageUrl = hasCustomImage ? community.image!.trim() : meta.bgImage;

  const displayLocation = formatLocationDisplay(community.location);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/15 p-4 h-[220px] min-h-[220px] max-h-[220px] flex flex-col justify-between shadow-2xl transition-all duration-300 hover:border-cyan-400/50 group"
    >
      {/* Crisp, Vibrant Background Image Layer */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <img
          src={bgImageUrl}
          alt={community.name}
          className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500 opacity-80"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = meta.bgImage;
          }}
        />
        {/* Subtle Dark Gradient Overlay for High Contrast & Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/30" />
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.colors.gradient} opacity-30 mix-blend-overlay`} />
      </div>

      {/* Live Activity Dot */}
      {(community.memberCount ?? 0) > 0 && (
        <span className="absolute top-3.5 right-3.5 flex h-2.5 w-2.5 z-10">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.colors.dot} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${meta.colors.dot}`} />
        </span>
      )}

      {/* 1. Top Row: Icon, Title, Category Badge, Stats */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-lg flex-shrink-0 backdrop-blur-md shadow-lg">
            {meta.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-white text-sm leading-tight truncate max-w-[130px] drop-shadow-md" title={community.name}>
                {community.name}
              </h3>
              <Badge className={`text-[9px] px-1.5 py-0.2 border ${meta.colors.badge} font-semibold backdrop-blur-md`}>
                {community.category}
              </Badge>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-white/80 pt-0.5 font-medium drop-shadow-sm">
              <span className="flex items-center gap-1"><Users className="w-3 h-3 text-cyan-400" />{community.memberCount ?? 0}</span>
              <span className="flex items-center gap-1 truncate max-w-[85px]"><MapPin className="w-3 h-3 text-cyan-400" />{displayLocation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Body: Vertically Centered Description */}
      <div className="flex-1 flex items-center py-2 relative z-10">
        <p className="text-xs text-white/90 font-medium line-clamp-2 leading-relaxed drop-shadow-md">
          {community.description}
        </p>
      </div>

      {/* 3. Bottom Row: Action Buttons */}
      <div className="flex gap-2 pt-2 border-t border-white/15 relative z-10">
        {/* View button only for joined communities — hide on suggested (unjoined) cards */}
        {joined && (
          <Link href={`/community/${community.id}`} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full text-white/90 hover:text-white hover:bg-white/20 text-xs h-8 rounded-xl font-semibold border border-white/15 backdrop-blur-md">
              View
              <ChevronRight className="w-3 h-3 ml-1 text-cyan-400" />
            </Button>
          </Link>
        )}
        <Button
          size="sm"
          onClick={() => onJoin(community.id)}
          disabled={joining || joined}
          className={`text-xs h-8 rounded-xl font-bold transition-all shadow-md ${
            joined
              ? "flex-1 bg-white/15 text-white/70 border border-white/15 backdrop-blur-md cursor-default hover:bg-white/15"
              : "w-full bg-primary hover:bg-primary/90 text-white shadow-cyan-500/25"
          }`}
        >
          {joined ? (
            <><Check className="w-3 h-3 mr-1 text-green-400" /> Joined</>
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
