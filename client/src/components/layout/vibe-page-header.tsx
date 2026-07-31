import { useLocation } from "wouter";
import { ChevronLeft, MapPin, Bell, User as UserIcon, Edit3 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface VibePageHeaderProps {
  mode?: "home" | "detail";
  title?: string;
  locationName?: string;
  unreadCount?: number;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  backHref?: string;
  rightElement?: React.ReactNode;
}

export function VibePageHeader({
  mode = "home",
  title,
  locationName: propLocationName,
  unreadCount: propUnreadCount,
  onNotificationClick,
  onProfileClick,
  backHref,
  rightElement,
}: VibePageHeaderProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const locationName = propLocationName ?? (user as any)?.location ?? "Local";
  const unreadCount = propUnreadCount ?? 0;

  const handleBack = () => {
    if (backHref) {
      setLocation(backHref);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/dashboard");
    }
  };

  const userAvatar = (user as any)?.avatarUrl || user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80";
  const userInitials = user?.name ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "SV";

  const handleProfileTap = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      setLocation("/settings/profile");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#050d1a]/85 backdrop-blur-xl border-b border-white/[0.08] safe-area-top px-4 py-2.5 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {mode === "home" ? (
          <>
            {/* Top Left: Profile Avatar with Glowing Ring + Edit Badge + SameVibe Title */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleProfileTap}
                className="relative group flex-shrink-0 active:scale-95 transition-transform"
                title="Edit Profile"
              >
                <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_12px_-2px_rgba(0,212,255,0.5)]">
                  <Avatar className="w-full h-full rounded-full overflow-hidden">
                    <AvatarImage src={userAvatar} alt={user?.name || "Profile"} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-cyan-300 font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {/* Tiny Edit Pencil Badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-cyan-400 text-slate-950 rounded-full flex items-center justify-center border border-slate-950 shadow-sm">
                  <Edit3 className="w-2.5 h-2.5 font-bold" />
                </div>
              </button>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 cursor-pointer"
                onClick={handleProfileTap}
              >
                <span className="font-display font-extrabold text-xl tracking-tight text-white drop-shadow-sm">
                  SameVibe
                </span>
              </motion.div>
            </div>

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
