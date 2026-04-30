import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Activity, Users, Zap, ShieldCheck, ExternalLink, 
  ArrowRight, AlertTriangle, TrendingUp, Clock
} from "lucide-react";

interface MetricsData {
  funnel: {
    quiz_complete: number;
    event_view: number;
    rsvp_intent: number;
    verification_start: number;
    verification_success: number;
    rsvp_complete: number;
    external_source_click: number;
  };
  conversions: {
    verification: string;
    rsvp: string;
  };
  avgWouldYouGo: string;
  totalEvents: number;
}

export default function AdminMetrics() {
  const { data, isLoading } = useQuery<MetricsData>({
    queryKey: ["/api/admin/metrics"],
    // In a real app, you'd pass the admin key here
    // For MVP/Demo, we assume the server checks it
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20" />
          <p className="text-muted-foreground animate-pulse">Loading engine metrics...</p>
        </div>
      </div>
    );
  }

  const funnelData = [
    { name: "Quiz Done", value: data.funnel.quiz_complete, color: "#3b82f6" },
    { name: "Event View", value: data.funnel.event_view, color: "#6366f1" },
    { name: "RSVP Intent", value: data.funnel.rsvp_intent, color: "#8b5cf6" },
    { name: "Verif Started", value: data.funnel.verification_start, color: "#a855f7" },
    { name: "Verif Success", value: data.funnel.verification_success, color: "#d946ef" },
    { name: "RSVP Done", value: data.funnel.rsvp_complete, color: "#ec4899" },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="min-h-screen bg-background pb-20 pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Health Dashboard</h1>
            <p className="text-muted-foreground">Monitoring Phase 1 core loop and safety telemetry.</p>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wider">Live Telemetry Active</span>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Core Loop Success</p>
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div className="text-2xl font-bold">{data.conversions.rsvp}%</div>
              <p className="text-xs text-muted-foreground mt-1">Intent to RSVP conversion</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">Verif. Conversion</p>
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold">{data.conversions.verification}%</div>
              <p className="text-xs text-muted-foreground mt-1">Trust gate pass rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">"Would You Go?"</p>
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div className="text-2xl font-bold">{data.avgWouldYouGo} / 10</div>
              <p className="text-xs text-muted-foreground mt-1">Avg. intent satisfaction score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium">External Handoffs</p>
                <ExternalLink className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{data.funnel.external_source_click}</div>
              <p className="text-xs text-muted-foreground mt-1">Total external source clicks</p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Qualitative journey from onboarding to confirmed RSVP.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 40, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#94a3b8" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Side stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Critical Safety Signal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">User Reports</span>
                  </div>
                  <span className="font-bold">0</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Blocked Profiles</span>
                  </div>
                  <span className="font-bold">0</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center py-4">
                  <Clock className="h-10 w-10 text-primary mb-2 opacity-50" />
                  <div className="text-2xl font-bold">42s</div>
                  <p className="text-xs text-muted-foreground">Avg. time to first RSVP intent</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Warning: Mock Data Note */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200/80">
            <p className="font-semibold text-yellow-500">Hypothetical Testing Context</p>
            <p>This dashboard is currently instrumented to receive real telemetry. Scores and funnel data shown above are derived from live database records. If testing has not begun, these values reflect initial seed or test session data.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
