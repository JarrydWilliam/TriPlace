import { motion } from "framer-motion";
import { Calendar, Users, Clock, MapPin } from "lucide-react";
import { Link } from "wouter";

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
  attendeeCount?: number;
  attendees?: VibeEventAttendee[];
  actionLabel?: "Explore" | "Collab" | "Join" | "View";
  onClick?: () => void;
}

export function VibeEventCard({
  id,
  title,
  date = "June 15",
  time = "6 PM",
  location = "Central Park",
  imageUrl = "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80",
  attendeeCount = 28,
  attendees = [],
  actionLabel = "Explore",
  onClick,
}: VibeEventCardProps) {
  // Default mock attendees if none provided
  const displayAttendees = attendees.length > 0
    ? attendees.slice(0, 3)
    : [
        { id: 1, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
        { id: 2, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" },
        { id: 3, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" },
      ];

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="min-w-[280px] max-w-[300px] sm:min-w-[300px] snap-start rounded-2xl bg-card/40 backdrop-blur-xl border border-cyan-500/30 p-3 flex flex-col justify-between shadow-[0_0_20px_-4px_rgba(0,212,255,0.2)] hover:shadow-[0_0_28px_-2px_rgba(0,212,255,0.35)] transition-all duration-300 relative group overflow-hidden"
    >
      {/* Top Banner Image with Overlay Chips */}
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1a] via-transparent to-black/30" />

        {/* 📅 Date Chip (Top Left) */}
        <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white flex items-center gap-1.5 font-medium">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>{date}</span>
        </div>

        {/* 👥 Attendee Count Chip (Top Right) */}
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

        {/* Bottom Row: Pill Action Button + Attendee Avatar Cluster */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-2">
          <Link href={`/events`}>
            <button
              type="button"
              onClick={onClick}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95 shadow-[0_0_10px_-2px_rgba(0,212,255,0.3)]"
            >
              {actionLabel}
            </button>
          </Link>

          {/* Overlapping Avatar Cluster */}
          <div className="flex items-center -space-x-2 overflow-hidden">
            {displayAttendees.map((att, idx) => (
              <img
                key={att.id || idx}
                src={att.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
                alt={att.name || "Attendee"}
                className="w-7 h-7 rounded-full border-2 border-[#050d1a] object-cover"
              />
            ))}
            {attendeeCount > 3 && (
              <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#050d1a] text-[10px] font-bold text-white flex items-center justify-center backdrop-blur-md">
                +{attendeeCount - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
