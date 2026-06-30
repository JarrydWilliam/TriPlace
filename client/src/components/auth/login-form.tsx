import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithGoogle, signInWithApple } from "@/lib/firebase";
import { apiRequest } from "@/lib/queryClient";
import { FaGoogle } from "react-icons/fa";
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onEmailSignup?: () => void;
  onShowLogin?: () => void;
  showEmailButton?: boolean;
  /** Controls whether the card shows sign-in or sign-up fields */
  mode?: "signup" | "login";
}

export function LoginForm({
  onEmailSignup,
  onShowLogin,
  showEmailButton = true,
  mode = "signup",
}: LoginFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email/password form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Sign-in failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      toast({
        title: "Apple Sign-in failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAppleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const body =
        mode === "signup"
          ? { email, password, name: name || email.split("@")[0] }
          : { email, password };

      const res = await apiRequest("POST", endpoint, body);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Authentication failed");
      }

      // On success the server sets the session — redirect handled by App.tsx auth state
      window.location.reload();
    } catch (error: any) {
      toast({
        title: mode === "signup" ? "Sign-up failed" : "Sign-in failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="w-full max-w-md mx-auto relative group">
      {/* Dynamic Glowing Aura behind the card */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-primary via-accent to-secondary rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      
      <Card className="relative w-full bg-[#0d0a1a]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-2xl overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        
        <CardHeader className="text-center pb-2 pt-6 relative z-10">
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            {isLogin ? "Welcome back" : "Join SameVibe"}
          </CardTitle>
          <CardDescription className="text-white/50 text-sm mt-1">
            {isLogin
              ? "Sign in to find your people and discover your scene"
              : "Create your digital third place and start connecting"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 relative z-10 pb-6">
          {/* Apple Sign-In (Primary) */}
          <Button
            onClick={handleAppleLogin}
            disabled={appleLoading}
            className="w-full bg-white text-black hover:bg-gray-200 py-4 px-6 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg min-h-[52px]"
          >
            {appleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.62-1.48 3.608-2.922 1.156-1.674 1.631-3.328 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.502 1.09zM15.515 3.833c.843-1.012 1.4-2.427 1.245-3.833-1.207.052-2.662.805-3.532 1.818-.68.827-1.33 2.273-1.144 3.662 1.358.111 2.662-.623 3.431-1.647z"/>
              </svg>
            )}
            <span>{isLogin ? "Sign in with Apple" : "Continue with Apple"}</span>
          </Button>

          {/* Premium Glass Google Sign-In (Secondary) */}
          <Button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 text-white py-4 px-6 rounded-xl font-medium text-sm hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] min-h-[52px]"
            variant="outline"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white/70" />
            ) : (
              <FaGoogle className="text-[#ea4335] w-4.5 h-4.5 filter drop-shadow-[0_0_6px_rgba(234,67,53,0.3)]" />
            )}
            <span>{isLogin ? "Sign in with Google" : "Continue with Google"}</span>
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-white/10" />
            <span className="text-white/30 text-xs font-semibold uppercase tracking-widest">or</span>
            <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-white/10 to-white/10" />
          </div>

          {/* Email/Password form */}
          {showEmailButton && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name" className="text-white/60 text-xs font-medium tracking-wide">
                    YOUR NAME
                  </Label>
                  <div className="relative group/input">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within/input:text-primary transition-colors" />
                    <Input
                      id="auth-name"
                      type="text"
                      placeholder="First name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10.5 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all min-h-[46px]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="auth-email" className="text-white/60 text-xs font-medium tracking-wide">
                  EMAIL ADDRESS
                </Label>
                <div className="relative group/input">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10.5 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all min-h-[46px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-password" className="text-white/60 text-xs font-medium tracking-wide">
                  PASSWORD
                </Label>
                <div className="relative group/input">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Your password" : "At least 8 characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? 1 : 8}
                    className="pl-10.5 pr-10 bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all min-h-[46px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl py-3.5 min-h-[50px] transition-all duration-300 active:scale-[0.99] shadow-lg shadow-primary/25 hover:shadow-primary/45"
              >
                {/* Glow overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.15)_40%,rgba(255,255,255,0.15)_60%,transparent_80%)] -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-out" />
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {/* Toggle link */}
          <p className="text-center text-white/40 text-sm mt-6">
            {isLogin ? (
              <>
                New to SameVibe?{" "}
                <button
                  onClick={onShowLogin}
                  className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline transition-all duration-200"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={onShowLogin}
                  className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline transition-all duration-200"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
