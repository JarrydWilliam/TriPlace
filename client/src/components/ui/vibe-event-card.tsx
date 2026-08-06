import { motion } from "framer-motion";
import { Calendar, Users, Clock, MapPin, Link2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { categoryColor, defaultCategoryColors } from "@/lib/constants";

export interface VibeEventAttendee {
  id: number | string;
  name?: string;
  avatar?: string | null;
}

export interface VibeEventCardProps {
  id: number | string;
  title: string;
  category?: string;
  date?: string; // e.g. "June 15"
  time?: string; // e.g. "6 PM"
  location?: string; // e.g. "Central Park"
  imageUrl?: string;
  image?: string;
  attendeeCount?: number;
  attendees?: VibeEventAttendee[];
  actionLabel?: "Explore" | "Collab" | "Join" | "View";
  onClick?: () => void;
  /** Attribution: name of the external source this event was imported from */
  sourceName?: string;
  /** Attribution: URL of the source — makes the attribution line tappable */
  sourceUrl?: string;
  /** True when the event originated from an external import */
  isExternal?: boolean;
  /** True when registration must be completed on an external site */
  externalRegistration?: boolean;
}

export function VibeEventCard({
  id,
  title,
  category,
  date = "June 15",
  time = "6 PM",
  location = "Central Park",
  imageUrl,
  image,
  attendeeCount = 28,
  attendees = [],
  actionLabel = "Explore",
  onClick,
  sourceName,
  sourceUrl,
  isExternal,
  externalRegistration,
}: VibeEventCardProps) {
  const imgSrc = image || imageUrl || "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80";

  // Only display real registered platform attendees who have RSVP'd
  const displayAttendees = attendees && attendees.length > 0
    ? attendees.filter(att => att && (att.avatar || att.name)).slice(0, 3)
    : [];

  const showExternalBadge = isExternal || externalRegistration;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="min-w-[280px] max-w-[300px] sm:min-w-[300px] snap-start rounded-2xl bg-card/40 backdrop-blur-xl border border-cyan-500/30 p-3 flex flex-col justify-between shadow-[0_0_20px_-4px_rgba(0,212,255,0.2)] hover:shadow-[0_0_28px_-2px_rgba(0,212,255,0.35)] transition-all duration-300 relative group overflow-hidden"
    >
      {/* Top Banner Image with Overlay Chips */}
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
        <div className="relative w-full h-full">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
          {/* Gradient fallback — always rendered underneath */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              categoryColor[category as string]?.gradient ?? defaultCategoryColors.gradient
            } opacity-70`}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-transparent to-black/30 pointer-events-none" />

        {/* Date Chip (Top Left) */}
        <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 font-medium">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>{date}</span>
        </div>

        {/* Attendee Count Chip (Top Right) */}
        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 font-medium">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>{attendeeCount}</span>
        </div>
      </div>

      {/* Content details */}
      <div className="space-y-2 px-1 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-white line-clamp-1 leading-snug">
            {title}
          </h3>

          <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
              <span>{date}, {time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: CTA + external badge + avatar cluster */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href={`/events`}>
              <button
                type="button"
                onClick={onClick}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-[0_0_10px_-2px_rgba(0,212,255,0.3)]"
              >
                {actionLabel}
              </button>
            </Link>

            {/* "Register externally" pill — shown when event requires off-platform registration */}
            {showExternalBadge && (
              <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-400/30 text-amber-300 rounded-full px-2.5 py-1 text-[10px] font-semibold">
                <ExternalLink className="w-3 h-3" />
                Register externally
              </span>
            )}
          </div>

          {/* Overlapping Avatar Cluster — only rendered for real registered platform attendees */}
          {displayAttendees.length > 0 && (
            <div className="flex items-center -space-x-2 overflow-hidden">
              {displayAttendees.map((att, idx) => (
                <div key={att.id || idx} className="w-7 h-7 rounded-full border-2 border-[#050d1a] overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
                  {att.avatar ? (
                    <img
                      src={att.avatar}
                      alt={att.name || "Attendee"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-cyan-400">
                      {att.name ? att.name.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                </div>
              ))}
              {attendeeCount > displayAttendees.length && (
                <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#050d1a] text-[10px] font-bold text-white flex items-center justify-center backdrop-blur-md">
                  +{attendeeCount - displayAttendees.length}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source attribution line — rendered when event was imported from an external source */}
        {sourceName && (
          <div className="flex items-center gap-1 pt-1">
            <Link2 className="w-3 h-3 text-white/30 shrink-0" />
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/40 hover:text-white/70 transition-colors truncate"
              >
                via {sourceName}
              </a>
            ) : (
              <span className="text-[11px] text-white/40 truncate">via {sourceName}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
