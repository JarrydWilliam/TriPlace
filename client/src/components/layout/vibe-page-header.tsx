import { useLocation } from "wouter";
import { ChevronLeft, MapPin, Bell } from "lucide-react";
import { motion } from "framer-motion";

interface VibePageHeaderProps {
  mode?: "home" | "detail";
  title?: string;
  locationName?: string;
  unreadCount?: number;
  onNotificationClick?: () => void;
  backHref?: string;
  rightElement?: React.ReactNode;
}

export function VibePageHeader({
  mode = "home",
  title,
  locationName = "NYC",
  unreadCount = 6,
  onNotificationClick,
  backHref,
  rightElement,
}: VibePageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backHref) {
      setLocation(backHref);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#050d1a]/80 backdrop-blur-xl border-b border-white/[0.06] safe-area-top px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {mode === "home" ? (
          <>
            {/* SameVibe Wordmark */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                SameVibe
              </span>
            </motion.div>

            {/* Right controls: NYC Location Pill + Bell */}
            <div className="flex items-center gap-2.5">
              {/* Location Pill */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_-3px_rgba(0,212,255,0.3)]">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{locationName}</span>
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onNotificationClick}
                className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 p-2 rounded-full relative shadow-[0_0_12px_-3px_rgba(0,212,255,0.3)] hover:bg-cyan-500/20 active:scale-95 transition-all"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-cyan-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 text-[#050d1a] font-bold text-[10px] rounded-full flex items-center justify-center border border-[#050d1a]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Detail Mode: Back Arrow + Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold font-display text-white tracking-tight">
                {title || "SameVibe"}
              </h1>
            </div>

            {/* Optional Right Action Element */}
            {rightElement ? (
              <div>{rightElement}</div>
            ) : (
              <div className="w-9" /> // Spacer for balanced centering
            )}
          </>
        )}
      </div>
    </header>
  );
}
