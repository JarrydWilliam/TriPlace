/**
 * Safely format event date and time strings with full timezone conversion support.
 */
export function formatEventDateTime(
  rawDate: Date | string | number | null | undefined,
  rawTime?: string,
  eventTimezone?: string
): {
  dateStr: string;     // e.g. "Aug 15"
  timeStr: string;     // e.g. "7:00 PM MDT"
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

    // Determine target timezone (use eventTimezone if valid, otherwise browser timezone)
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };

    const fullOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    };

    if (eventTimezone) {
      try {
        options.timeZone = eventTimezone;
        fullOptions.timeZone = eventTimezone;
        timeOptions.timeZone = eventTimezone;
      } catch {
        // Fallback to user browser timezone if eventTimezone is invalid
      }
    }

    const dateStr = new Intl.DateTimeFormat("en-US", options).format(dateObj);
    const fullDateStr = new Intl.DateTimeFormat("en-US", fullOptions).format(dateObj);
    const timeStr = rawTime || new Intl.DateTimeFormat("en-US", timeOptions).format(dateObj);

    return { dateStr, timeStr, fullDateStr };
  } catch (err) {
    return { dateStr: "Upcoming", timeStr: rawTime || "Time TBD", fullDateStr: "Date TBD" };
  }
}
