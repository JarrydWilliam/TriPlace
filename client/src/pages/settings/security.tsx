import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Lock, AlertTriangle, Mail } from "lucide-react";
import { Link } from "wouter";

export default function SecuritySettings() {
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();

  const providers = firebaseUser?.providerData.map((p) => p.providerId) ?? [];
  const isGoogleUser = providers.some((p) => p === "google.com");
  const isAppleUser = providers.some((p) => p === "apple.com");

  return (
    <div className="mobile-page-container bg-background relative overflow-hidden">
      {/* Rich ambient bokeh */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Security Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Sign-In Method */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Sign-In Method</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 border border-white/10 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your account is secured via:
                </p>
                <div className="flex flex-wrap gap-2">
                  {isGoogleUser && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      Google Sign-In
                    </Badge>
                  )}
                  {isAppleUser && (
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      Apple Sign-In
                    </Badge>
                  )}
                  {!isGoogleUser && !isAppleUser && (
                    <Badge variant="secondary">Email / Password</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/80 mt-2">
                  Authentication is handled securely by{" "}
                  {isGoogleUser ? "Google" : isAppleUser ? "Apple" : "Firebase"}.
                  SameVibe does not store your password.
                </p>
              </div>
            </CardContent>
          </Card>



          {/* Security Alerts / Report */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-yellow-500/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                <span>Security Concerns</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500/90">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  If you notice any suspicious activity on your account, please contact
                  us immediately so we can help secure it.
                </p>
              </div>

              <a href="mailto:security@samevibe.app">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  Report Security Issue — security@samevibe.app
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}