import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle } from "@/lib/firebase";
import { FaGoogle } from "react-icons/fa";
import { Mail, ArrowLeft } from "lucide-react";
import { EmailAuthForm } from "./email-auth-form";

interface LoginFormProps {
  onEmailSignup?: () => void;
  onShowLogin?: () => void;
  showEmailButton?: boolean;
}

export function LoginForm({ onEmailSignup, onShowLogin, showEmailButton = true }: LoginFormProps) {
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [showSignInOptions, setShowSignInOptions] = useState(false);
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signup");

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      alert(`Sign-in failed: ${error.message}`);
    }
  };

  const handleEmailSignup = () => {
    setEmailMode("signup");
    setShowEmailAuth(true);
  };

  const handleEmailSignin = () => {
    setEmailMode("signin");
    setShowEmailAuth(true);
  };

  const handleShowLogin = () => {
    setShowSignInOptions(true);
  };

  const handleBackToMain = () => {
    setShowEmailAuth(false);
    setShowSignInOptions(false);
  };

  // Show email authentication form
  if (showEmailAuth) {
    return (
      <EmailAuthForm
        mode={emailMode}
        onModeChange={setEmailMode}
        onBack={handleBackToMain}
      />
    );
  }

  // Show sign-in options (Google + Email)
  if (showSignInOptions) {
    return (
      <Card className="w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm border-gray-700">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToMain}
            className="absolute top-4 left-4 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <CardTitle className="text-2xl font-bold">Sign In to TriPlace</CardTitle>
          <CardDescription className="text-gray-400">
            Choose your preferred sign-in method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-white text-gray-900 py-4 px-6 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg"
            variant="outline"
          >
            <FaGoogle className="text-red-500" />
            <span>Continue with Google</span>
          </Button>
          
          <Button
            onClick={handleEmailSignin}
            className="w-full bg-primary py-4 px-6 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg"
          >
            <Mail className="mr-2 h-5 w-5" />
            Sign in with Email
          </Button>
          
          <p className="text-sm text-gray-400 text-center">
            Don't have an account?{" "}
            <button 
              onClick={handleBackToMain}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show main sign-up options
  return (
    <Card className="w-full max-w-md mx-auto bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome to TriPlace</CardTitle>
        <CardDescription className="text-gray-400">
          Connect through shared experiences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-gray-900 py-4 px-6 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg"
          variant="outline"
        >
          <FaGoogle className="text-red-500" />
          <span>Continue with Google</span>
        </Button>
        
        {showEmailButton && (
          <>
            <Button
              onClick={handleEmailSignup}
              className="w-full bg-primary py-4 px-6 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg"
            >
              <Mail className="mr-2 h-5 w-5" />
              Sign up with Email
            </Button>
            
            <p className="text-sm text-gray-400 text-center">
              Already have an account?{" "}
              <button 
                onClick={handleShowLogin}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Sign in
              </button>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
