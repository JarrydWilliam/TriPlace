import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, signInWithGoogle, signInWithApple } from "@/lib/firebase";
import { apiRequest, getApiUrl } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { Mail, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Guard: redirect already-logged-in users to their destination
  useEffect(() => {
    if (!authLoading && user) {
      setLocation(user.onboardingCompleted ? "/dashboard" : "/onboarding");
    }
  }, [user, authLoading, setLocation]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      // Create user record in our DB
      await apiRequest("POST", "/api/auth/register", { firebaseUid: cred.user.uid, email, name }).catch((err) => {
        if (!err.message.includes("already exists") && !err.message.includes("409")) {
          throw err;
        }
      });
      setLocation("/onboarding");
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "").replace(/\s*\(.*\)/, "") ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      // auth-context resolves user; check if they already have an account
      const cred = auth.currentUser;
      if (cred) {
        const res = await fetch(getApiUrl(`/api/users/firebase/${cred.uid}`));
        if (res.ok) {
          const existingUser = await res.json();
          setLocation(existingUser.onboardingCompleted ? "/dashboard" : "/onboarding");
          return;
        }
      }
      setLocation("/onboarding");
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "").replace(/\s*\(.*\)/, "") ?? "Google signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithApple();
      // auth-context resolves user; check if they already have an account
      const cred = auth.currentUser;
      if (cred) {
        const res = await fetch(getApiUrl(`/api/users/firebase/${cred.uid}`));
        if (res.ok) {
          const existingUser = await res.json();
          setLocation(existingUser.onboardingCompleted ? "/dashboard" : "/onboarding");
          return;
        }
      }
      setLocation("/onboarding");
    } catch (err: any) {
      setError(err.message?.replace("Firebase: ", "").replace(/\s*\(.*\)/, "") ?? "Apple signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background flex items-center justify-center px-4 py-8">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[100px] bg-primary/30" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[100px] bg-accent/30" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-6 relative z-10 group"
      >
        {/* Logo and header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-6 hover:scale-105 transition-transform duration-300">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Join SameVibe
          </h1>
          <p className="text-sm text-muted-foreground">Discover your people, locally.</p>
        </div>

        {/* Dynamic Card Container */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition duration-700"></div>
          
          <div className="relative bg-card/40 backdrop-blur-3xl border border-white/5 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-5">
            
            {/* Apple Sign-Up (Primary) */}
            <Button
              className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 shadow-lg min-h-[48px]"
              onClick={handleAppleSignup}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.62-1.48 3.608-2.922 1.156-1.674 1.631-3.328 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.502 1.09zM15.515 3.833c.843-1.012 1.4-2.427 1.245-3.833-1.207.052-2.662.805-3.532 1.818-.68.827-1.33 2.273-1.144 3.662 1.358.111 2.662-.623 3.431-1.647z"/>
              </svg>
              Continue with Apple
            </Button>

            {/* Google Sign-Up (Secondary) */}
            <Button
              variant="outline"
              className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 text-white py-3 rounded-xl font-medium text-sm hover:bg-white/[0.08] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] min-h-[48px]"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg className="w-4 h-4 filter drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-[1px] bg-border/50" />
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">or</span>
              <div className="flex-1 h-[1px] bg-border/50" />
            </div>

            {/* Email Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-muted-foreground text-xs font-medium tracking-wide">FULL NAME</Label>
                <div className="relative group/input">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    className="pl-9 pr-4 min-h-[46px] bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-muted-foreground text-xs font-medium tracking-wide">EMAIL ADDRESS</Label>
                <div className="relative group/input">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="pl-9 pr-4 min-h-[46px] bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-muted-foreground text-xs font-medium tracking-wide">PASSWORD</Label>
                <div className="relative group/input">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within/input:text-primary transition-colors" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    className="pl-9 pr-10 min-h-[46px] bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-[#ef4444] bg-[#ef4444]/10 rounded-xl p-3 border border-[#ef4444]/20 animate-shake">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full relative overflow-hidden group/btn bg-gradient-to-r from-primary to-accent text-white font-semibold rounded-xl py-3.5 min-h-[48px] transition-all duration-300 active:scale-[0.99] shadow-lg shadow-primary/25 hover:shadow-primary/45"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.15)_40%,rgba(255,255,255,0.15)_60%,transparent_80%)] -translate-x-[100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-out" />
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer links */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline transition-all duration-200">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground/70">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="hover:underline hover:text-foreground">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="hover:underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
}
