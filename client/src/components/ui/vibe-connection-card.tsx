import { motion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import { Link } from "wouter";

export interface VibeConnectionCardProps {
  id: number | string;
  name: string;
  avatar?: string | null;
  matchPercent?: number; // e.g. 94
  bio?: string;
  onMatchClick?: () => void;
  onShareClick?: () => void;
}

export function VibeConnectionCard({
  id,
  name,
  avatar,
  matchPercent = 94,
  onMatchClick,
  onShareClick,
}: VibeConnectionCardProps) {
  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="min-w-[160px] max-w-[180px] snap-start rounded-2xl bg-card/40 backdrop-blur-xl border border-white/10 p-3.5 flex flex-col items-center justify-between text-center relative group shadow-lg hover:border-cyan-500/30 transition-all duration-300"
    >
      {/* Top Right Share Button */}
      <button
        type="button"
        onClick={onShareClick}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-all"
        aria-label="Share profile"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {/* Avatar Container with Cyan Gradient Ring & Heart Badge */}
      <div className="relative mt-2 mb-2.5">
        {/* Gradient ring */}
        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-accent to-emerald-400 shadow-[0_0_16px_-2px_rgba(0,212,255,0.4)]">
          <img
            src={avatar || defaultAvatar}
            alt={name}
            className="w-full h-full rounded-full object-cover bg-[#050d1a]"
          />
        </div>

        {/* Heart Badge at Bottom Right of Avatar */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-[#050d1a] border-2 border-[#050d1a] flex items-center justify-center shadow-md">
          <Heart className="w-3 h-3 fill-current" />
        </div>
      </div>

      {/* Vibe Match Percent & Name */}
      <div className="space-y-0.5 mb-3 w-full">
        <p className="text-[11px] font-semibold text-cyan-400 tracking-wide">
          {matchPercent}% Vibe Match
        </p>
        <h4 className="font-display font-bold text-sm text-white truncate">
          {name}
        </h4>
      </div>

      {/* Match Button */}
      <Link href={`/profile/${id}`}>
        <button
          type="button"
          onClick={onMatchClick}
          className="w-full bg-white/10 hover:bg-cyan-500/20 text-white hover:text-cyan-300 border border-white/10 hover:border-cyan-500/40 rounded-full py-1.5 px-4 text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm"
        >
          Match
        </button>
      </Link>
    </motion.div>
  );
}
