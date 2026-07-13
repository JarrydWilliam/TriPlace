import { motion } from "framer-motion";
import { Users, MapPin, ChevronRight, Plus, Check } from "lucide-react";
import { Link } from "wouter";
import { Community } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categoryColor, CATEGORY_EMOJIS, defaultCategoryColors } from "@/lib/constants";

interface CommunityCardProps {
  community: Community;
  joined: boolean;
  onJoin: (id: number) => void;
  joining?: boolean;
}

export function SharedCommunityCard({ community, joined, onJoin, joining = false }: CommunityCardProps) {
  const colors = categoryColor[community.category] ?? defaultCategoryColors;
  const emoji = CATEGORY_EMOJIS[community.category] ?? "✨";

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
          {emoji}
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
              ? "bg-white/10 text-white/60 cursor-default hover:bg-white/10"
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
