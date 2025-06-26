import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { MapPin, Users, Calendar, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";

export default function Landing() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleEmailSignup = () => {
    navigate("/onboarding");
  };

  const handleShowLogin = () => {
    // For now, just show the same form - in a real app you'd have separate login/signup forms
    console.log("Show login form");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen relative overflow-hidden bg-gray-900">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20"></div>
      <div 
        className="absolute inset-0 opacity-30" 
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      ></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
            <span className="text-2xl font-bold text-white">TriPlace</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-300 hover:text-primary transition-colors">Features</a>
            <a href="#community" className="text-gray-300 hover:text-primary transition-colors">Community</a>
            <a href="#events" className="text-gray-300 hover:text-primary transition-colors">Events</a>
          </nav>
        </header>

        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">
              Your Digital<br />Third Place
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Where genuine connection, shared passions, and meaningful community are always just around the corner.
            </p>
            
            {/* Authentication Form */}
            <div className="max-w-md mx-auto">
              <LoginForm 
                onEmailSignup={handleEmailSignup}
                onShowLogin={handleShowLogin}
              />
            </div>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700">
            <div className="w-12 h-12 bg-accent rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Users className="text-white h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Find Communities</h3>
            <p className="text-gray-400 text-sm">Join interest-based groups near you</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700">
            <div className="w-12 h-12 bg-secondary rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Calendar className="text-white h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Discover Events</h3>
            <p className="text-gray-400 text-sm">Local events within 50 miles</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700">
            <div className="w-12 h-12 bg-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Heart className="text-white h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Give Kudos</h3>
            <p className="text-gray-400 text-sm">Appreciate community members</p>
          </div>
        </div>
      </div>
    </section>
  );
}
