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

export function SharedCommunityCard({ community, joined, onJoin, joining = false }: CommunityCardProps) {
  const meta = getCategoryMeta(community.category);
  const bgImageUrl = community.image && community.image.trim().length > 5 
    ? community.image 
    : meta.bgImage;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/10 p-4.5 h-[220px] min-h-[220px] max-h-[220px] flex flex-col justify-between backdrop-blur-md shadow-xl transition-all duration-300 hover:border-cyan-500/40"
    >
      {/* Background Image Layer with Dark Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <img
          src={bgImageUrl}
          alt={community.name}
          className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500 opacity-40"
          loading="lazy"
          onError={(e) => {
            // Fallback to category default image if custom URL fails
            (e.target as HTMLImageElement).src = meta.bgImage;
          }}
        />
        {/* Dark Vignette & Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/85 to-slate-950/95`} />
        <div className={`absolute inset-0 bg-gradient-to-br ${meta.colors.gradient} opacity-40 mix-blend-overlay`} />
      </div>

      {/* Live activity indicator */}
      {(community.memberCount ?? 0) > 0 && (
        <span className="absolute top-4 right-4 flex h-2 w-2 z-10">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.colors.dot} opacity-60`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${meta.colors.dot}`} />
        </span>
      )}

      {/* Top Header & Info Area */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-lg flex-shrink-0 backdrop-blur-md shadow-inner">
            {meta.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[145px]" title={community.name}>
                {community.name}
              </h3>
              <Badge className={`text-[9px] px-1.5 py-0.2 border ${meta.colors.badge} font-medium`}>
                {community.category}
              </Badge>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-white/50 pt-0.5">
              <span className="flex items-center gap-1 font-medium"><Users className="w-3 h-3 text-cyan-400" />{community.memberCount ?? 0}</span>
              {community.location && <span className="flex items-center gap-1 font-medium truncate max-w-[90px]"><MapPin className="w-3 h-3 text-cyan-400" />{community.location}</span>}
            </div>
          </div>
        </div>

        <p className="text-xs text-white/70 line-clamp-2 leading-relaxed min-h-[34px] h-[34px] overflow-hidden">
          {community.description}
        </p>
      </div>

      {/* Bottom Actions Row — Fixed Height */}
      <div className="flex gap-2 pt-2 border-t border-white/10 relative z-10">
        <Link href={`/community/${community.id}`} className="flex-1">
          <Button size="sm" variant="ghost" className="w-full text-white/70 hover:text-white hover:bg-white/10 text-xs h-8 rounded-xl font-medium border border-white/10">
            View
            <ChevronRight className="w-3 h-3 ml-1 text-cyan-400" />
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={() => onJoin(community.id)}
          disabled={joining || joined}
          className={`flex-1 text-xs h-8 rounded-xl font-bold transition-all ${
            joined
              ? "bg-white/10 text-white/50 border border-white/10 cursor-default hover:bg-white/10"
              : "bg-primary hover:bg-primary/90 text-white shadow-md shadow-cyan-500/20"
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
