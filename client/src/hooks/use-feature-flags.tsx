/**
 * useFeatureFlags — SameVibe Runtime Feature Kill Switches
 * ─────────────────────────────────────────────────────────
 * Fetches /api/features on app load and every 5 minutes.
 * Any feature can be disabled server-side instantly without
 * a deployment or App Store re-submission.
 *
 * Usage:
 *   const { isEnabled } = useFeatureFlags();
 *   if (!isEnabled("community_join")) return <Fallback />;
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { getApiUrl } from "@/lib/queryClient";

interface FeatureFlags {
  [key: string]: {
    enabled: boolean;
    fallbackMessage?: string;
  };
}

const DEFAULT_FLAGS: FeatureFlags = {
  community_join: { enabled: true },
  messaging: { enabled: true },
  event_discovery: { enabled: true },
  ai_matching: { enabled: true },
  rsvp: { enabled: true },
  push_notifications: { enabled: true },
  ota_updates: { enabled: true },
};

interface FeatureFlagsContextValue {
  flags: FeatureFlags;
  isEnabled: (name: string) => boolean;
  getFallbackMessage: (name: string) => string;
  refresh: () => Promise<void>;
}

import React from "react";

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: DEFAULT_FLAGS,
  isEnabled: () => true,
  getFallbackMessage: () => "This feature is temporarily unavailable.",
  refresh: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/api/features"), {
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return;
      const data = await res.json();
      setFlags((prev) => ({ ...prev, ...data }));

      // Log any disabled features so devs can see them in console
      const disabled = Object.entries(data).filter(([, v]: any) => !v.enabled);
      if (disabled.length > 0) {
        console.warn("[FeatureFlags] Disabled features:", disabled.map(([k]) => k));
      }
    } catch {
      // Silent fail — keep last known flags
    }
  }, []);

  useEffect(() => {
    fetchFlags();
    const interval = setInterval(fetchFlags, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (name: string) => flags[name]?.enabled ?? true,
    [flags]
  );

  const getFallbackMessage = useCallback(
    (name: string) =>
      flags[name]?.fallbackMessage || "This feature is temporarily unavailable. Please try again shortly.",
    [flags]
  );

  return (
    <FeatureFlagsContext.Provider value={{ flags, isEnabled, getFallbackMessage, refresh: fetchFlags }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
