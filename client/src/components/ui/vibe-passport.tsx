/**
 * VibePassport — Official Dashboard Section 6 Feature.
 *
 * Sourced from /api/users/:id/passport endpoint (GPS-verified check-ins).
 * - Single-color metallic brass ink styling (#d4a24c / #e5b869)
 * - feTurbulence distressed edge filter
 * - Curved SVG textPath for category labels
 * - Weekly reward completion bar (4 segments with gift icon 🎁 for consecutive weeks)
 * - Frequent Traveler status badge
 * - Lifetime Tier Card (New Traveler → Regular → Local Legend)
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Stamp, MapPin, Star, Gift, Sparkles } from "lucide-react";
import { apiRequest, getApiUrl } from "@/lib/queryClient";

interface PassportSummary {
  totalStamps: number;
  currentTier: string;
  consecutiveCompletedWeeks: number;
  isFrequentTraveler: boolean;
  weeklyCompletions: Array<{
    id: number;
    weekIdentifier: string;
    checkInCount: number;
    isCompleted: boolean;
  }>;
  stamps: Array<{
    id: number;
    title: string;
    category: string;
    date: string;
    location: string;
    checkedInAt?: string;
  }>;
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

// ─── Brass Ink Stamp Badge ─────────────────────────────────────────────────────
// Uses single-color metallic brass ink (#d4a24c), feTurbulence, and SVG curved category text.
function BrassInkStamp({
  event,
  index,
}: {
  event: any;
  index: number;
}) {
  const filterId = `brass-inkdisplace-${index}`;
  const arcId = `category-arc-${index}`;
  
  const dateLabel = event.date || event.checkedInAt
    ? new Date(event.date || event.checkedInAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const words = (event.title as string || "").split(/\s+/);
  const initials = words
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "SV";

  const categoryLabel = (event.category || "COMMUNITY").toUpperCase();

  // Brass ink palette
  const brassColor = "#d4a24c";
  const brassLight = "#e5b869";
  const brassBg = "rgba(212, 162, 76, 0.08)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      className="flex flex-col items-center gap-1.5"
    >
      <svg
        width="84"
        height="84"
        viewBox="0 0 84 84"
        style={{ overflow: "visible" }}
        aria-label={`Stamp: ${event.title}`}
      >
        <defs>
          {/* Distressed edge filter */}
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.07"
              numOctaves="3"
              seed={index + 3}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="3.2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Curved top arc for category textPath */}
          {/* Arc path along the top half of circle (radius 30, center 42,42) */}
          <path
            id={arcId}
            d="M 16,42 A 26,26 0 0,1 68,42"
            fill="none"
          />
        </defs>

        {/* Outer distressed brass ring */}
        <circle
          cx="42"
          cy="42"
          r="38"
          fill="none"
          stroke={brassColor}
          strokeWidth="3.5"
          strokeDasharray="5 3"
          filter={`url(#${filterId})`}
          opacity="0.88"
        />

        {/* Inner fill */}
        <circle cx="42" cy="42" r="31" fill={brassBg} />

        {/* Inner thin brass ring */}
        <circle
          cx="42"
          cy="42"
          r="31"
          fill="none"
          stroke={brassLight}
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Curved category text along top arc */}
        <text
          fill={brassColor}
          fontSize="7.5"
          fontWeight="700"
          fontFamily="'Outfit', sans-serif"
          letterSpacing="1"
          opacity="0.8"
        >
          <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
            {categoryLabel}
          </textPath>
        </text>

        {/* Initials in center */}
        <text
          x="42"
          y="42"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={brassColor}
          fontWeight="800"
          fontSize="16"
          fontFamily="'Outfit', sans-serif"
          letterSpacing="1"
          opacity="0.95"
        >
          {initials}
        </text>

        {/* Date text at bottom */}
        <text
          x="42"
          y="57"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={brassLight}
          fontWeight="600"
          fontSize="8"
          fontFamily="'Outfit', sans-serif"
          opacity="0.8"
        >
          {dateLabel}
        </text>
      </svg>

      {/* Event title below stamp */}
      <p className="text-[10px] text-white/60 font-medium text-center leading-tight max-w-[80px]">
        {(event.title as string).length > 20
          ? (event.title as string).slice(0, 18) + "…"
          : event.title}
      </p>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface VibePassportProps {
  userId: number;
  userJoinedEvents?: any[];
}

export function VibePassport({ userId }: VibePassportProps) {
  // Query backend passport summary endpoint (requires auth)
  const { data: passportData, isLoading } = useQuery<PassportSummary>({
    queryKey: ["/api/users", userId, "passport"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${userId}/passport`);
      return res.json();
    },
    enabled: !!userId,
  });

  // Strictly use GPS-verified stamps from backend passport summary endpoint
  const stamps = passportData?.stamps ?? [];

  const totalStamps = passportData?.totalStamps ?? stamps.length;
  const tier = getTier(totalStamps);

  const consecutiveWeeks = passportData?.consecutiveCompletedWeeks ?? 0;
  const isFrequentTraveler = passportData?.isFrequentTraveler ?? false;

  // 4-segment weekly reward completion bar logic
  const targetWeeks = 4;
  const weeklyProgressPercent = Math.min(100, (consecutiveWeeks / targetWeeks) * 100);

  return (
    <section className="pt-4 border-t border-white/10 space-y-4" aria-label="My Vibe Passport">
      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stamp className="w-5 h-5 text-[#d4a24c]" />
          <h2 className="font-display font-bold text-xl text-white tracking-tight">
            My Vibe Passport
          </h2>
        </div>
        {totalStamps > 0 && (
          <span className="text-xs font-semibold text-[#d4a24c]">
            {totalStamps} {totalStamps === 1 ? "stamp" : "stamps"}
          </span>
        )}
      </div>

      {/* ── Tier Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-2xl border border-[#d4a24c]/30 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/70 backdrop-blur-xl p-4 shadow-xl relative overflow-hidden"
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
              <p className="text-sm font-bold leading-tight" style={{ color: tier.color }}>
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
                {totalStamps}/{tier.nextAt}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 4-Segment Weekly Reward Completion Bar ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#d4a24c]" />
            <h3 className="text-xs font-bold text-white">Weekly Attendance Streak</h3>
          </div>
          <span className="text-[11px] font-semibold text-[#d4a24c]">
            {consecutiveWeeks}/{targetWeeks} Weeks
          </span>
        </div>

        {/* 4-segment progress bar */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((step) => {
            const isFilled = consecutiveWeeks >= step;
            const isTarget = step === 4;
            return (
              <div key={step} className="relative flex flex-col items-center">
                <div
                  className={`h-2.5 w-full rounded-full transition-all duration-500 ${
                    isFilled
                      ? "bg-gradient-to-r from-[#d4a24c] to-[#e5b869] shadow-md shadow-[#d4a24c]/30"
                      : "bg-white/10"
                  }`}
                />
                <div className="mt-1 flex items-center justify-center">
                  {isTarget ? (
                    <span className={`text-xs ${isFilled ? "opacity-100 scale-110" : "opacity-40"}`}>
                      🎁
                    </span>
                  ) : (
                    <span className="text-[9px] text-white/40 font-mono">W{step}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status indicator */}
        {isFrequentTraveler ? (
          <div className="flex items-center gap-1.5 bg-[#d4a24c]/15 border border-[#d4a24c]/40 rounded-xl px-3 py-1.5 text-xs text-[#e5b869] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#d4a24c] animate-pulse" />
            <span>Frequent Traveler Status Unlocked! 🌟</span>
          </div>
        ) : (
          <p className="text-[11px] text-white/40 leading-snug">
            Check in at least 1 event per week for 4 consecutive weeks to unlock Frequent Traveler status & exclusive rewards.
          </p>
        )}
      </div>

      {/* ── Stamp Grid ── */}
      {stamps.length > 0 ? (
        <div className="rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-4">
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 justify-items-center">
            {stamps.map((event: any, i: number) => (
              <BrassInkStamp key={event.id ?? i} event={event} index={i} />
            ))}
          </div>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="rounded-2xl border border-white/8 bg-slate-900/40 backdrop-blur-md p-8 flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#d4a24c]/10 border border-[#d4a24c]/30 flex items-center justify-center">
            <Stamp className="w-7 h-7 text-[#d4a24c]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/80">No stamps yet</p>
            <p className="text-xs text-white/40 mt-1 leading-relaxed">
              Attend a community event and verify your GPS check-in to earn your first brass passport stamp.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#d4a24c]">
            <MapPin className="w-3 h-3" />
            <span>Stamps are earned at GPS-verified events</span>
          </div>
        </div>
      )}

      {/* ── Footer note ── */}
      {stamps.length > 0 && (
        <p className="text-[11px] text-white/25 text-center px-4 leading-relaxed">
          Each brass stamp represents a real event you checked into.{" "}
          <Star className="w-2.5 h-2.5 inline-block mb-0.5 text-[#d4a24c]" /> Local Legend at 15 stamps.
        </p>
      )}
    </section>
  );
}
