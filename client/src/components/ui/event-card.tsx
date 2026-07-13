import { motion } from "framer-motion";
import { Calendar, MapPin, ChevronRight, ExternalLink } from "lucide-react";
import { Event } from "@shared/schema";
import { categoryColor } from "@/lib/constants";

interface PremiumEventCardProps {
  event: Event;
  onClick?: () => void;
}

export function PremiumEventCard({ event, onClick }: PremiumEventCardProps) {
  const colorTheme =
    categoryColor[
      (event.category as keyof typeof categoryColor) || "social"
    ] || categoryColor.social;

  const eventDate = event.date ? new Date(event.date) : null;
  const month = eventDate
    ? eventDate.toLocaleDateString(undefined, { month: "short" })
    : "TBD";
  const day = eventDate
    ? eventDate.toLocaleDateString(undefined, { day: "numeric" })
    : "-";
  const time = eventDate
    ? eventDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-muted/20 border border-border/30 hover:bg-muted/30 hover:border-border/50 transition-all cursor-pointer"
    >
      {/* Top Banner Area (Replaces heavy imagery with a clean gradient wash) */}
      <div
        className="h-16 w-full opacity-40 group-hover:opacity-60 transition-opacity"
        style={{
          background: `linear-gradient(to right, var(--tw-gradient-stops))`,
        }}
      >
        <div className={`w-full h-full bg-gradient-to-r ${colorTheme.gradient}`} />
      </div>

      {/* Date Badge Float */}
      <div className="absolute top-3 right-3 flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-background/90 backdrop-blur-md border border-border/50 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">
          {month}
        </div>
        <div className="text-lg font-bold text-foreground leading-none mt-1">
          {day}
        </div>
      </div>

      <div className="p-4 pt-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-foreground text-base leading-tight mb-2 line-clamp-2">
          {event.title}
        </h3>

        <div className="space-y-3 mt-auto">
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-sm ${colorTheme.badge} uppercase tracking-wider`}>
              {event.category || "Social"}
            </div>
            {time && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{time}</span>
              </div>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Footer / Attribution */}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            {event.sourceAttribution ? (
              <>
                <span>via {event.sourceAttribution}</span>
              </>
            ) : (
              <span>SameVibe Local</span>
            )}
          </div>
          {event.sourceUrl ? (
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
