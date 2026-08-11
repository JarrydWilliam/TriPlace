/**
 * Safely format event date and time strings without timezone roll-back errors.
 */
export function formatEventDateTime(rawDate: Date | string | number | null | undefined, rawTime?: string): {
  dateStr: string;     // e.g. "Aug 15"
  timeStr: string;     // e.g. "7:00 PM"
  fullDateStr: string; // e.g. "Saturday, August 15, 2026"
} {
  if (!rawDate) {
    return { dateStr: "Upcoming", timeStr: rawTime || "Time TBD", fullDateStr: "Date TBD" };
  }

  try {
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) {
      return { dateStr: "Upcoming", timeStr: rawTime || "Time TBD", fullDateStr: "Date TBD" };
    }

    const utcHours = dateObj.getUTCHours();
    const utcMinutes = dateObj.getUTCMinutes();

    // Check if timestamp is set to UTC midnight (00:00:00.000Z), indicating date-only precision
    const isUtcMidnight = utcHours === 0 && utcMinutes === 0 && dateObj.getUTCMilliseconds() === 0;

    if (isUtcMidnight) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const monthName = months[dateObj.getUTCMonth()];
      const fullMonthName = fullMonths[dateObj.getUTCMonth()];
      const dayNum = dateObj.getUTCDate();
      const dayName = days[dateObj.getUTCDay()];
      const year = dateObj.getUTCFullYear();

      return {
        dateStr: `${monthName} ${dayNum}`,
        timeStr: rawTime || "7:00 PM",
        fullDateStr: `${dayName}, ${fullMonthName} ${dayNum}, ${year}`,
      };
    }

    // Explicit datetime with real local/UTC time
    const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fullDateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const timeStr = rawTime || dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    return { dateStr, timeStr, fullDateStr };
  } catch (err) {
    return { dateStr: "Upcoming", timeStr: rawTime || "Time TBD", fullDateStr: "Date TBD" };
  }
}
