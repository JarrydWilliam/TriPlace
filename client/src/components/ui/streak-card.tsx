import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Flame, Trophy, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Streak {
  userId: number;
  currentStreak: number;
  bestStreak: number;
  totalCheckins: number;
  lastCheckinDate: string | null;
}

interface StreakCardProps {
  userId: number;
}

export function StreakCard({ userId }: StreakCardProps) {
  const queryClient = useQueryClient();

  const { data: streak } = useQuery<Streak>({
    queryKey: ["/api/users", userId, "streak"],
    queryFn: () => apiRequest(`/api/users/${userId}/streak`),
  });

  const checkin = useMutation({
    mutationFn: () => apiRequest(`/api/users/${userId}/checkin`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "streak"] });
    },
  });

  const isCheckedInToday =
    streak?.lastCheckinDate === new Date().toISOString().split("T")[0];

  const current = streak?.currentStreak ?? 0;
  const best = streak?.bestStreak ?? 0;
  const total = streak?.totalCheckins ?? 0;

  return (
    <Card className="border border-orange-500/20 bg-gradient-to-br from-orange-950/30 to-red-950/30">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={current > 0 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
            >
              <Flame className={`w-5 h-5 ${current > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
            </motion.div>
            <div>
              <p className="text-xs text-muted-foreground">Daily Streak</p>
              <p className="text-xl font-bold text-orange-400">{current}<span className="text-sm font-normal text-muted-foreground ml-1">days</span></p>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <div className="flex items-center gap-1 justify-end">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Best</span>
              </div>
              <p className="text-sm font-semibold">{best}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 justify-end">
                <CalendarCheck className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-sm font-semibold">{total}</p>
            </div>
          </div>
        </div>
        {!isCheckedInToday && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => checkin.mutate()}
            disabled={checkin.isPending}
            className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
          >
            {checkin.isPending ? "Checking in..." : "✓ Check in today"}
          </motion.button>
        )}
        {isCheckedInToday && (
          <p className="mt-3 text-center text-xs text-emerald-400">✓ Checked in today!</p>
        )}
      </CardContent>
    </Card>
  );
}
