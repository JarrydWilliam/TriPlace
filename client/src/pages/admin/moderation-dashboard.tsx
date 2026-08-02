import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, CheckCircle, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FlaggedLog {
  id: number;
  contentType: string;
  contentId?: number;
  authorId: number;
  flagReason: string;
  contentSnippet: string;
  confidenceScore: number;
  status: string;
  flaggedAt: string;
}

export default function ModerationDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: flaggedItems = [], isLoading, refetch } = useQuery<FlaggedLog[]>({
    queryKey: ["/api/admin/moderation/flagged"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/moderation/flagged");
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      const res = await apiRequest("POST", `/api/admin/moderation/${id}/action`, { action });
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Action Recorded",
        description: `Flagged log marked as ${variables.action}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation/flagged"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to take moderation action.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-[100dvh] bg-background text-foreground p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Safety & Moderation Agent</h1>
            <p className="text-sm text-muted-foreground">
              Review content flagged automatically by the ContentSafetyAgent.
            </p>
          </div>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Queue
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p>Loading flagged content queue...</p>
        </div>
      ) : flaggedItems.length === 0 ? (
        <Card className="glass-card bg-slate-900/50 border-white/10 text-center py-16">
          <CardContent className="space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Moderation Queue Clear</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No pending flagged content logs requiring human review at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            {flaggedItems.length} Pending Review Items
          </div>

          {flaggedItems.map((item) => (
            <Card key={item.id} className="glass-card bg-slate-900/60 border-white/10 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 uppercase text-[10px]">
                      {item.flagReason.replace("_", " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      Type: {item.contentType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Author ID: #{item.authorId}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Flagged at {new Date(item.flaggedAt).toLocaleString()} • Confidence: {Math.round((item.confidenceScore || 1) * 100)}%
                  </p>
                </div>
              </div>

              {/* Snippet box */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-foreground/90 font-mono">
                "{item.contentSnippet}"
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => resolveMutation.mutate({ id: item.id, action: "approved" })}
                  disabled={resolveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Approve (Unhide)
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  onClick={() => resolveMutation.mutate({ id: item.id, action: "warned" })}
                  disabled={resolveMutation.isPending}
                >
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Warn User
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => resolveMutation.mutate({ id: item.id, action: "removed" })}
                  disabled={resolveMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Confirm Removal
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
