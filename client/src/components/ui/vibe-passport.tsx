/**
 * VibePassport — Dashboard Section 6 replacement.
 *
 * Displays every GPS-verified event check-in (event_attendees.status = 'attended')
 * as a circular ink-stamp badge arranged in a passport-visa grid.
 * Also shows a lifetime tier card (New Traveler → Regular → Local Legend).
 *
 * Data source: reuses the userJoinedEvents query already fetched by the
 * dashboard, filtered client-side to status === 'attended'.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Stamp, MapPin, Star } from "lucide-react";

// ─── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_PALETTE: Record<string, { ring: string; ink: string; bg: string }> = {
  sports:   { ring: "#06b6d4", ink: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  music:    { ring: "#a855f7", ink: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  art:      { ring: "#ec4899", ink: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  food:     { ring: "#f59e0b", ink: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  tech:     { ring: "#14b8a6", ink: "#14b8a6", bg: "rgba(20,184,166,0.12)" },
  outdoors: { ring: "#22c55e", ink: "#22c55e", bg: "rgba(34,197,94,0.12)"  },
  social:   { ring: "#818cf8", ink: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  creative: { ring: "#f472b6", ink: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  default:  { ring: "#06b6d4", ink: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
};

function palette(category?: string) {
  if (!category) return CATEGORY_PALETTE.default;
  const key = category.toLowerCase();
  return CATEGORY_PALETTE[key] ?? CATEGORY_PALETTE.default;
}

// ─── Tier logic ────────────────────────────────────────────────────────────────
function getTier(count: number): {
  label: string;
  emoji: string;
  description: string;
  nextAt: number | null;
  color: string;
} {
  if (count >= 15) {
    return {
      label: "Local Legend",
      emoji: "🏛️",
      description: "You live & breathe the local scene.",
      nextAt: null,
      color: "#f59e0b",
    };
  }
  if (count >= 5) {
    return {
      label: "Regular",
      emoji: "🌆",
      description: "A familiar face in the community.",
      nextAt: 15,
      color: "#a855f7",
    };
  }
  return {
    label: "New Traveler",
    emoji: "🧭",
    description: "Your Third Place journey has begun.",
    nextAt: 5,
    color: "#06b6d4",
  };
}

// ─── SVG Ink Stamp Badge ───────────────────────────────────────────────────────
// Uses feTurbulence displacement to give edges a distressed, inked look.
function InkStamp({
  event,
  index,
}: {
  event: any;
  index: number;
}) {
  const p = palette(event.category);
  const filterId = `inkdisplace-${index}`;
  const dateLabel = event.date
    ? new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const words = (event.title as string).split(/\s+/);
  const initials = words
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      className="flex flex-col items-center gap-1.5"
    >
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        style={{ overflow: "visible" }}
        aria-label={`Stamp: ${event.title}`}
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.065"
              numOctaves="3"
              seed={index + 1}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="3.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>

        {/* Outer distressed ring */}
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={p.ring}
          strokeWidth="3.5"
          strokeDasharray="4 3"
          filter={`url(#${filterId})`}
          opacity="0.85"
        />

        {/* Inner fill */}
        <circle cx="40" cy="40" r="29" fill={p.bg} />

        {/* Inner thin ring */}
        <circle
          cx="40"
          cy="40"
          r="29"
          fill="none"
          stroke={p.ring}
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Initials text */}
        <text
          x="40"
          y="38"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={p.ink}
          fontWeight="800"
          fontSize="16"
          fontFamily="'Outfit', sans-serif"
          letterSpacing="1"
          opacity="0.9"
        >
          {initials}
        </text>

        {/* Date arc text at bottom */}
        <text
          x="40"
          y="55"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={p.ink}
          fontWeight="500"
          fontSize="8"
          fontFamily="'Outfit', sans-serif"
          opacity="0.7"
        >
          {dateLabel}
        </text>
      </svg>

      {/* Event title below stamp */}
      <p
        className="text-[10px] text-white/60 font-medium text-center leading-tight max-w-[76px]"
      >
        {(event.title as string).length > 20
          ? (event.title as string).slice(0, 18) + "…"
          : event.title}
      </p>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface VibePassportProps {
  /** All events the user has RSVP'd to — filtered here to status==='attended'. */
  userJoinedEvents: any[] | undefined;
  userId: number;
}

export function VibePassport({ userJoinedEvents, userId }: VibePassportProps) {
  // Filter to confirmed attended events only
  const stamps = useMemo(() => {
    if (!Array.isArray(userJoinedEvents)) return [];
    return userJoinedEvents.filter(
      (e: any) => e.attendeeStatus === "attended" || e.status === "attended"
    );
  }, [userJoinedEvents]);

  const tier = getTier(stamps.length);
  const progressToNext = tier.nextAt
    ? Math.min(100, (stamps.length / tier.nextAt) * 100)
    : 100;

  return (
    <section
      className="pt-4 border-t border-white/10 space-y-4"
      aria-label="Vibe Passport"
    >
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stamp className="w-5 h-5 text-cyan-400" />
          <h2 className="font-display font-bold text-xl text-white tracking-tight">
            My Vibe Passport
          </h2>
        </div>
        {stamps.length > 0 && (
          <span className="text-xs font-semibold text-cyan-400">
            {stamps.length} {stamps.length === 1 ? "stamp" : "stamps"}
          </span>
        )}
      </div>

      {/* ── Tier Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-xl p-4 shadow-xl"
        style={{
          boxShadow: `0 0 32px ${tier.color}22`,
          borderColor: `${tier.color}33`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border"
              style={{
                background: `${tier.color}20`,
                borderColor: `${tier.color}40`,
              }}
            >
              {tier.emoji}
            </div>
            <div>
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: tier.color }}
              >
                {tier.label}
              </p>
              <p className="text-xs text-white/50 mt-0.5">{tier.description}</p>
            </div>
          </div>
          {tier.nextAt && (
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                Next tier
              </p>
              <p className="text-xs font-bold text-white/70 mt-0.5">
                {stamps.length}/{tier.nextAt}
              </p>
            </div>
          )}
        </div>

        {/* Tier progress bar */}
        {tier.nextAt && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: tier.color }}
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              {tier.nextAt - stamps.length} more{" "}
              {tier.nextAt - stamps.length === 1 ? "stamp" : "stamps"} to{" "}
              {tier.nextAt === 5 ? "Regular" : "Local Legend"}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Stamp Grid ── */}
      {stamps.length > 0 ? (
        <div
          className="rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-4"
          aria-label="Event stamps"
        >
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 justify-items-center">
            {stamps.map((event: any, i: number) => (
              <InkStamp key={event.id ?? i} event={event} index={i} />
            ))}
          </div>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-8 flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center">
            <Stamp className="w-7 h-7 text-cyan-400/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/70">
              No stamps yet
            </p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Attend a community event and mark your attendance to earn your
              first passport stamp.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400/70">
            <MapPin className="w-3 h-3" />
            <span>Stamps are earned at GPS-verified events</span>
          </div>
        </div>
      )}

      {/* ── Footer note ── */}
      {stamps.length > 0 && (
        <p className="text-[11px] text-white/25 text-center px-4 leading-relaxed">
          Each stamp represents a real event you showed up to.{" "}
          <Star className="w-2.5 h-2.5 inline-block mb-0.5 text-amber-400/50" /> Local
          Legend at 15 stamps.
        </p>
      )}
    </section>
  );
}
