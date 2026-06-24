import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithGoogle } from "@/lib/firebase";
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
    <Card className="w-full max-w-md mx-auto bg-white/8 backdrop-blur-xl border border-white/12 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-white">
          {isLogin ? "Welcome back" : "Join SameVibe"}
        </CardTitle>
        <CardDescription className="text-white/50">
          {isLogin
            ? "Sign in to find your people"
            : "Discover your community"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Google Sign-In */}
        <Button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full bg-white text-gray-900 py-4 px-6 rounded-xl font-semibold text-base hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg min-h-[52px]"
          variant="outline"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          ) : (
            <FaGoogle className="text-red-500 w-5 h-5" />
          )}
          <span>{isLogin ? "Sign in with Google" : "Continue with Google"}</span>
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email/Password form */}
        {showEmailButton && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            {!isLogin && (
              <div className="space-y-1">
                <Label htmlFor="auth-name" className="text-white/60 text-xs">
                  Your name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <Input
                    id="auth-name"
                    type="text"
                    placeholder="First name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary focus:ring-primary/30 min-h-[44px]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="auth-email" className="text-white/60 text-xs">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary focus:ring-primary/30 min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="auth-password" className="text-white/60 text-xs">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "Your password" : "At least 8 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? 1 : 8}
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary focus:ring-primary/30 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-semibold rounded-xl py-3 min-h-[52px] transition-all shadow-lg shadow-primary/25"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        )}

        {/* Toggle link */}
        <p className="text-center text-white/40 text-sm">
          {isLogin ? (
            <>
              New to SameVibe?{" "}
              <button
                onClick={onShowLogin}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={onShowLogin}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
