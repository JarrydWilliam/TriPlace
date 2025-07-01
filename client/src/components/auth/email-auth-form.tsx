import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { useLocation } from "wouter";

interface EmailAuthFormProps {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  onBack?: () => void;
}

export function EmailAuthForm({ mode, onModeChange, onBack }: EmailAuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
        // Redirect to profile setup after successful sign-up
        navigate("/profile-setup");
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader className="text-center">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute top-4 left-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <CardTitle className="text-2xl font-bold">
          {mode === "signup" ? "Create Account" : "Sign In"}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {mode === "signup" 
            ? "Join TriPlace and start connecting" 
            : "Welcome back to TriPlace"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary py-4 px-6 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              mode === "signup" ? "Create Account" : "Sign In"
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => onModeChange(mode === "signup" ? "signin" : "signup")}
                className="text-primary hover:text-primary/80 font-medium"
              >
                {mode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 