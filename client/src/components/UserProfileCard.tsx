import { motion } from "framer-motion";
import { Heart, Share2, MapPin, Sparkles, User as UserIcon } from "lucide-react";
import { Link } from "wouter";

export interface UserProfileCardProps {
  id: number | string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  interests?: string[];
  matchPercent?: number; // e.g. 94
  onMatchClick?: () => void;
  onShareClick?: () => void;
  className?: string;
}

export function UserProfileCard({
  id,
  name,
  avatar,
  bio,
  location,
  interests = [],
  matchPercent = 94,
  onMatchClick,
  onShareClick,
  className = "",
}: UserProfileCardProps) {
  const userInitial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={`min-w-[200px] max-w-[240px] snap-start rounded-3xl bg-card/50 backdrop-blur-xl border border-cyan-500/30 p-4 flex flex-col justify-between text-center relative group shadow-[0_0_20px_-4px_rgba(0,212,255,0.2)] hover:shadow-[0_0_28px_-2px_rgba(0,212,255,0.35)] hover:border-cyan-400 transition-all duration-300 ${className}`}
    >
      {/* Top Right Share Button */}
      {onShareClick && (
        <button
          type="button"
          onClick={onShareClick}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-cyan-500/20 transition-all z-10"
          aria-label="Share profile"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Avatar Container with Cyan Gradient Ring */}
      <div className="flex flex-col items-center">
        <div className="relative mt-1 mb-3">
          <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-emerald-400 shadow-[0_0_18px_-2px_rgba(0,212,255,0.4)]">
            <div className="w-full h-full rounded-full bg-[#050d1a] overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-cyan-400 font-bold text-xl">
                  {userInitial}
                </div>
              )}
            </div>
          </div>

          {/* Vibe Heart Badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 border-2 border-[#050d1a] flex items-center justify-center shadow-md">
            <Heart className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* User Identity Details */}
        <div className="space-y-1 w-full">
          <div className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-400/20 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-cyan-300">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{matchPercent}% Vibe Match</span>
          </div>

          <h4 className="font-display font-bold text-base text-white truncate pt-1">
            {name}
          </h4>

          {location && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground truncate px-1">
              <MapPin className="w-3 h-3 text-cyan-400/80 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {bio && (
            <p className="text-xs text-slate-300 line-clamp-2 px-1 pt-1 leading-relaxed">
              {bio}
            </p>
          )}
        </div>

        {/* Interest Tags (up to 3) */}
        {interests.length > 0 && (
          <div className="flex items-center justify-center flex-wrap gap-1 mt-2.5 mb-3 w-full">
            {interests.slice(0, 3).map((interest, idx) => (
              <span
                key={idx}
                className="bg-white/5 border border-white/10 text-cyan-300/90 rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Match / View Profile Action Button */}
      <div className="pt-2 border-t border-white/[0.06] mt-2 w-full">
        <Link href={`/profile/${id}`}>
          <button
            type="button"
            onClick={onMatchClick}
            className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-full py-1.5 px-4 text-xs font-bold transition-all duration-200 active:scale-95 shadow-[0_0_10px_-2px_rgba(0,212,255,0.3)]"
          >
            View Profile
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
