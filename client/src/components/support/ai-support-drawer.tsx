import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, MapPin, RefreshCw, ShieldCheck, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface AiSupportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiSupportDrawer({ open, onOpenChange }: AiSupportDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [lastActionApplied, setLastActionApplied] = useState<string | null>(null);

  // Quick Fix Mutation
  const quickFixMutation = useMutation({
    mutationFn: async (actionKey: string) => {
      const res = await apiRequest("POST", "/api/support/quick-fix", { actionKey });
      return res.json();
    },
    onSuccess: (data) => {
      setLastActionApplied(data.userMessage);
      toast({
        title: "Quick-Fix Applied! 🛠️",
        description: data.userMessage,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Quick-Fix Failed",
        description: "Could not execute automated fix. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI Support Chat & Ticket Submission Mutation
  const submitTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/support/ai-chat", {
        subject: subject.trim() || "General Support Inquiry",
        userMessage: message.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAiResponse(data.aiResponse);
      setMessage("");
      setSubject("");
      toast({
        title: "Ticket Logged 🎟️",
        description: `Ticket #${data.ticket.id} created (${data.ticket.priority} priority).`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send support request.",
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-slate-950 text-white border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <SheetHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-primary flex items-center justify-center text-white shadow-lg">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
                  SameVibe AI Support
                  <Badge variant="outline" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                    24/7 Live
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-white/60">
                  Instant automated fixes & direct founder ticket routing to jarryd@SameVibeapp.com
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Quick-Fix Diagnostic Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              One-Tap Diagnostic Fixes
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => quickFixMutation.mutate("fix_location_sync")}
                disabled={quickFixMutation.isPending}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-3 text-xs font-medium text-white/90"
              >
                <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">Fix Location & Recommendation Sync</p>
                  <p className="text-[11px] text-white/50">Resyncs location sharing & local feed</p>
                </div>
              </button>

              <button
                onClick={() => quickFixMutation.mutate("fix_slot_sync")}
                disabled={quickFixMutation.isPending}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-3 text-xs font-medium text-white/90"
              >
                <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">Fix Active Community Slot Sync</p>
                  <p className="text-[11px] text-white/50">Recalculates community slot limits</p>
                </div>
              </button>

              <button
                onClick={() => quickFixMutation.mutate("reset_discovery_defaults")}
                disabled={quickFixMutation.isPending}
                className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-3 text-xs font-medium text-white/90"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">Reset Discovery & Privacy Defaults</p>
                  <p className="text-[11px] text-white/50">Restores recommended visibility</p>
                </div>
              </button>
            </div>
          </div>

          {/* Last Fix Feedback */}
          {lastActionApplied && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{lastActionApplied}</span>
            </div>
          )}

          {/* AI Response Display */}
          {aiResponse && (
            <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Bot className="w-4 h-4" /> AI Support Response:
              </div>
              <p className="text-xs text-white/90 leading-relaxed">{aiResponse}</p>
            </div>
          )}

          {/* Chat / Ticket Submission Form */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              Ask AI or Submit Feedback
            </div>

            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (e.g. Question about community slots...)"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-xs rounded-xl"
            />

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or suggest an improvement..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40 text-xs rounded-xl resize-none"
            />

            <Button
              onClick={() => submitTicketMutation.mutate()}
              disabled={!message.trim() || submitTicketMutation.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-primary text-white font-semibold rounded-xl text-xs py-2.5 gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {submitTicketMutation.isPending ? "Analyzing & Routing..." : "Send Request to AI Support"}
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 text-[11px] text-white/40 text-center">
          Priority issues are automatically routed to <span className="text-white/70 font-mono">jarryd@SameVibeapp.com</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
