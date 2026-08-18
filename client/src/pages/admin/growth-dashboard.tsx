import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Share2,
  Copy,
  RefreshCw,
  Edit3,
  ShieldAlert,
  Link as LinkIcon,
  Sparkles,
  Layers,
  MapPin,
  Lock,
} from "lucide-react";

interface DailyBrief {
  generatedAt: string;
  isStale: boolean;
  topRecommendations: Array<{
    id: number;
    market: string;
    interest: string;
    gapSize: number;
    userDemandCount: number;
    supplyCount: number;
    reasoning: string;
    marketStatus: string;
  }>;
  marketSummaries: Array<{
    market: string;
    status: string;
    userCount: number;
    eventCount: number;
    rsvpCount: number;
  }>;
  contentQueue: {
    pending: any[];
    approved: any[];
    published: any[];
    rejected: any[];
    failed: any[];
  };
  outreachQueue: {
    pending: any[];
    approved: any[];
    rejected: any[];
  };
  platformConnections: Array<{
    id: number;
    platformName: string;
    connectedAccount: string;
    status: string;
  }>;
  top3Actions: Array<{
    action: string;
    reasoning: string;
    targetMarket: string;
  }>;
}

export default function GrowthDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingOutreachId, setEditingOutreachId] = useState<number | null>(null);
  const [editingOutreachText, setEditingOutreachText] = useState("");

  const getAdminHeaders = () => {
    const adminKey = sessionStorage.getItem("admin_key") || "";
    return {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    };
  };

  const { data: brief, isLoading, isError, refetch } = useQuery<DailyBrief>({
    queryKey: ["/api/growth/brief"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/growth/brief"), {
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch Growth Agent brief");
      return res.json();
    },
  });

  // Refresh Market Intelligence Mutation
  const refreshIntelligenceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/growth/intelligence/refresh"), {
        method: "POST",
        headers: getAdminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to refresh market intelligence");
      return res.json();
    },
    onSuccess: (res) => {
      toast({
        title: "Intelligence Refreshed",
        description: `Updated demand gaps across ${res.count} market signals.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
    onError: (err: any) => {
      toast({
        title: "Refresh Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Generate Drafts Mutation
  const generateDraftsMutation = useMutation({
    mutationFn: async () => {
      const resContent = await fetch(getApiUrl("/api/growth/content-drafts/generate"), {
        method: "POST",
        headers: getAdminHeaders(),
      });
      const resOutreach = await fetch(getApiUrl("/api/growth/outreach-drafts/generate"), {
        method: "POST",
        headers: getAdminHeaders(),
      });
      if (!resContent.ok || !resOutreach.ok) throw new Error("Failed to generate drafts");
      return { content: await resContent.json(), outreach: await resOutreach.json() };
    },
    onSuccess: () => {
      toast({
        title: "Drafts Generated",
        description: "Synthesized new real-data-backed content and outreach drafts.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
    onError: (err: any) => {
      toast({
        title: "Generation Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Update Content Draft Mutation (Approve / Reject / Edit)
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await fetch(getApiUrl(`/api/growth/content-drafts/${id}`), {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update content draft");
      return res.json();
    },
    onSuccess: () => {
      setEditingContentId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
  });

  // Publish Approved Draft Mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/growth/content-drafts/${id}/publish`), {
        method: "POST",
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Publishing failed");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Post Published!",
        description: `Successfully published to ${data.draft?.targetPlatform}. Live URL recorded.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
    onError: (err: any) => {
      toast({
        title: "Publish Failed",
        description: err.message,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
  });

  // Update Outreach Draft Mutation
  const updateOutreachMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await fetch(getApiUrl(`/api/growth/outreach-drafts/${id}`), {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update outreach draft");
      return res.json();
    },
    onSuccess: () => {
      setEditingOutreachId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
  });

  // Update Platform Connection Mutation
  const togglePlatformMutation = useMutation({
    mutationFn: async ({ platformName, newStatus }: { platformName: string; newStatus: string }) => {
      const res = await fetch(getApiUrl("/api/growth/platforms/connect"), {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          platformName,
          connectedAccount: `@samevibe_${platformName}`,
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update platform connection");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Platform Connection Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/growth/brief"] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Outreach text copied. You can now send it manually off-platform.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#080612] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Zap className="w-6 h-6 text-cyan-400 animate-bounce" />
          </div>
          <p className="text-cyan-400/80 font-medium">Aggregating Market Intelligence & Growth Signals...</p>
        </div>
      </div>
    );
  }

  if (isError || !brief) {
    return (
      <div className="min-h-[100dvh] bg-[#080612] text-white flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-slate-900 border-red-500/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-6 h-6" />
              <CardTitle>Growth Dashboard Error</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Failed to load growth brief data. Make sure you have admin permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => refetch()} className="w-full bg-slate-800 hover:bg-slate-700">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#080612] text-slate-100 pb-20 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <Sparkles className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white font-display">
                  Growth Agent V1 — Command Center
                </h1>
                <p className="text-slate-400 text-sm">
                  Organic Market Intelligence & Controlled Approval Queues
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {brief.isStale && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1 py-1">
                <Clock className="w-3.5 h-3.5" /> Data &gt;24h Stale
              </Badge>
            )}

            <Button
              onClick={() => refreshIntelligenceMutation.mutate()}
              disabled={refreshIntelligenceMutation.isPending}
              variant="outline"
              className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshIntelligenceMutation.isPending ? "animate-spin" : ""}`} />
              Refresh Signals
            </Button>

            <Button
              onClick={() => generateDraftsMutation.mutate()}
              disabled={generateDraftsMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generate New Drafts
            </Button>
          </div>
        </div>

        {/* Daily Brief Hero: Top 3 Recommended Actions */}
        <Card className="bg-slate-900/90 border-cyan-500/30 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-xl text-white font-bold">Today's Top Recommended Growth Actions</CardTitle>
              </div>
              <span className="text-xs text-slate-400">
                Brief Generated: {new Date(brief.generatedAt).toLocaleTimeString()}
              </span>
            </div>
            <CardDescription className="text-slate-400">
              Calculated from real database activity and local supply-demand gaps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {brief.top3Actions.map((action, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                      #{idx + 1} {action.targetMarket}
                    </Badge>
                    <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                      High Signal
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-white text-sm">{action.action}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{action.reasoning}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Market Summaries & Platform Connections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Markets & Intelligence */}
          <Card className="lg:col-span-2 bg-slate-900/80 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-lg text-white">Market Intelligence & Supply-Demand Gaps</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                City-by-city classification (New / Developing / Active) and recorded user demand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {brief.marketSummaries.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Not enough market data yet.</p>
              ) : (
                <div className="space-y-3">
                  {brief.marketSummaries.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{m.market}</span>
                          <Badge className={
                            m.status === "Active" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                            m.status === "Developing" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                            "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          }>
                            {m.status} Market
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          {m.userCount} local users • {m.eventCount} active activities • {m.rsvpCount} total RSVPs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Demand Gap Detail List */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detected Category Supply Gaps</h4>
                {brief.topRecommendations.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-medium text-white">{rec.market} — {rec.interest}</span>
                      <span className="text-cyan-400 font-bold">{rec.userDemandCount} Users Demand vs {rec.supplyCount} Supply</span>
                    </div>
                    <p className="text-slate-400">{rec.reasoning}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Connections & Security */}
          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-lg text-white">Social Platform Connections</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Official API publish credentials. DM scopes are explicitly disabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {brief.platformConnections.map((conn) => (
                  <div key={conn.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-sm capitalize">{conn.platformName}</div>
                      <div className="text-xs text-slate-400">{conn.connectedAccount}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        conn.status === "connected" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"
                      }>
                        {conn.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-slate-400 hover:text-white"
                        onClick={() => togglePlatformMutation.mutate({
                          platformName: conn.platformName,
                          newStatus: conn.status === "connected" ? "disconnected" : "connected",
                        })}
                      >
                        {conn.status === "connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 space-y-1">
                <div className="font-medium flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Controlled Access Policy
                </div>
                <p className="text-cyan-400/80">
                  Publishing requires an explicit, logged approval action by the founder. Disconnected platforms block publishing with clear UI alerts.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content & Outreach Approval Queues */}
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="content" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 font-semibold">
              <Share2 className="w-4 h-4 mr-2" /> Content Approval Queue ({brief.contentQueue.pending.length})
            </TabsTrigger>
            <TabsTrigger value="outreach" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 font-semibold">
              <Send className="w-4 h-4 mr-2" /> Outreach Approval Queue ({brief.outreachQueue.pending.length})
            </TabsTrigger>
          </TabsList>

          {/* Content Approval Queue Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg text-white">Social Content Drafts Queue</CardTitle>
                <CardDescription className="text-slate-400">
                  Short video scripts and social posts created from real SameVibe data. Only explicit approval triggers platform publish calls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Pending Content Drafts */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Pending Founder Approval ({brief.contentQueue.pending.length})
                  </h4>

                  {brief.contentQueue.pending.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No content drafts pending approval.</p>
                  ) : (
                    brief.contentQueue.pending.map((draft) => (
                      <div key={draft.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 uppercase text-[10px]">
                              {draft.targetPlatform}
                            </Badge>
                            <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                              {draft.type}
                            </Badge>
                            {draft.market && (
                              <span className="text-xs text-slate-400">Market: {draft.market}</span>
                            )}
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                            Awaiting Approval
                          </Badge>
                        </div>

                        {editingContentId === draft.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingContentId(null)}>Cancel</Button>
                              <Button size="sm" className="bg-cyan-500 text-slate-950 font-semibold" onClick={() => updateContentMutation.mutate({ id: draft.id, updates: { content: editingText } })}>
                                Save Edit
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap">
                            {draft.content}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                            onClick={() => {
                              setEditingContentId(draft.id);
                              setEditingText(draft.content);
                            }}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit Draft
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-400 hover:bg-red-950/40"
                              onClick={() => updateContentMutation.mutate({ id: draft.id, updates: { status: "rejected" } })}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>

                            <Button
                              size="sm"
                              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
                              onClick={() => publishDraftMutation.mutate(draft.id)}
                              disabled={publishDraftMutation.isPending}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Publish
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Published Content Drafts */}
                {brief.contentQueue.published.length > 0 && (
                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Published Posts ({brief.contentQueue.published.length})
                    </h4>
                    {brief.contentQueue.published.map((draft) => (
                      <div key={draft.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs gap-2">
                        <div>
                          <span className="font-medium text-white capitalize">{draft.targetPlatform} Post</span>
                          <p className="text-slate-400 line-clamp-1 mt-0.5">{draft.content}</p>
                        </div>
                        {draft.publishedUrl && (
                          <a
                            href={draft.publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-cyan-400 hover:underline shrink-0 font-medium"
                          >
                            <LinkIcon className="w-3.5 h-3.5" /> View Live Post
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outreach Approval Queue Tab (Strict Manual Send Only) */}
          <TabsContent value="outreach" className="space-y-6">
            <Card className="bg-slate-900/80 border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white">Organizer Outreach Queue</CardTitle>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1 text-xs">
                    <Lock className="w-3.5 h-3.5" /> Manual Send Only
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Personalized outreach messages for prospective local organizers. The Growth Agent never messages anyone—copy approved drafts to send manually.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Pending Outreach Drafts */}
                <div className="space-y-4">
                  {brief.outreachQueue.pending.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No outreach drafts pending approval.</p>
                  ) : (
                    brief.outreachQueue.pending.map((draft) => (
                      <div key={draft.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-white text-sm">{draft.targetName}</div>
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                            Awaiting Review
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-400">{draft.reasoning}</p>

                        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap">
                          {draft.draftMessage}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                            onClick={() => copyToClipboard(draft.draftMessage)}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Message
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-400 hover:bg-red-950/40"
                              onClick={() => updateOutreachMutation.mutate({ id: draft.id, updates: { status: "rejected" } })}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>

                            <Button
                              size="sm"
                              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
                              onClick={() => {
                                updateOutreachMutation.mutate({ id: draft.id, updates: { status: "approved" } });
                                copyToClipboard(draft.draftMessage);
                              }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve & Copy Text
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Approved Outreach Ready to Copy */}
                {brief.outreachQueue.approved.length > 0 && (
                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Approved Outreach (Ready for Founder Manual Send)
                    </h4>
                    {brief.outreachQueue.approved.map((draft) => (
                      <div key={draft.id} className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 text-xs">
                        <div>
                          <div className="font-medium text-white">{draft.targetName}</div>
                          <p className="text-slate-400 line-clamp-1 mt-0.5">{draft.draftMessage}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-900 border-slate-700 text-cyan-400 hover:text-cyan-300 shrink-0"
                          onClick={() => copyToClipboard(draft.draftMessage)}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copy Text
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
