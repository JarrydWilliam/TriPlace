import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentInsights {
  inferred: string[];
  lastRunAt: string | null;
  trending: Array<{ tag: string; eventCount: number; score: number }>;
  interestsDelta: { added: string[]; removed: string[] };
}

interface AgentInsightsCardProps {
  userId: number;
}

export function AgentInsightsCard({ userId }: AgentInsightsCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [pulseAgent, setPulseAgent] = useState(false);

  const { data: insights, isLoading } = useQuery<AgentInsights>({
    queryKey: ["/api/users", userId, "agent-insights"],
    queryFn: () => apiRequest(`/api/users/${userId}/agent-insights`),
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const runAgent = useMutation({
    mutationFn: () => apiRequest(`/api/agent/run/${userId}`, { method: "POST" }),
    onMutate: () => setPulseAgent(true),
    onSettled: () => {
      setPulseAgent(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "agent-insights"] });
    },
  });

  const lastRunText = insights?.lastRunAt
    ? `Last scanned ${new Date(insights.lastRunAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Not yet run";

  const newInterests = insights?.interestsDelta?.added ?? [];
  const trending = insights?.trending?.slice(0, 4) ?? [];
  const inferred = insights?.inferred ?? [];

  return (
    <Card className="border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-indigo-950/40 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={pulseAgent ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
              transition={{ repeat: pulseAgent ? Infinity : 0, duration: 1 }}
              className="p-1.5 rounded-full bg-violet-500/20"
            >
              <Bot className="w-4 h-4 text-violet-400" />
            </motion.div>
            <CardTitle className="text-sm font-semibold text-violet-300">SameVibe Agent</CardTitle>
            {pulseAgent && (
              <Badge variant="outline" className="text-xs border-violet-500/50 text-violet-400 animate-pulse">
                Scanning...
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-violet-400 hover:text-violet-300"
            onClick={() => runAgent.mutate()}
            disabled={runAgent.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runAgent.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{lastRunText}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* New discoveries banner */}
        <AnimatePresence>
          {newInterests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-violet-200">New interests discovered!</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {newInterests.map((tag) => (
                    <Badge key={tag} className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30">
                      {tag.replace(/-/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trending local activity */}
        {trending.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs font-medium text-emerald-300">Trending near you</p>
            </div>
            <div className="space-y-1">
              {trending.map((t) => (
                <div key={t.tag} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{t.tag.replace(/-/g, " ")}</span>
                  <span className="text-xs text-emerald-400">{t.eventCount} event{t.eventCount !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expandable: all inferred interests */}
        {inferred.length > 0 && (
          <div>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              onClick={() => setExpanded(!expanded)}
            >
              <span>All inferred interests ({inferred.length})</span>
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1 mt-2">
                    {inferred.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] text-muted-foreground">
                        {tag.replace(/-/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!isLoading && inferred.length === 0 && trending.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Agent will scan your local area after your first activity.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
