import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Users, Calendar, Heart } from "lucide-react";
import { useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { PWAInstall } from "@/components/ui/pwa-install";



export default function Landing() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect logged-in users before rendering the landing page content
  if (!loading && user) {
    navigate("/dashboard");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-pulse">
            <Logo size="xl" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading SameVibe...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="mobile-page-container relative overflow-hidden bg-gray-900 no-pull-refresh">
      {/* Background: pure CSS gradient — no external image dependency for offline/Capacitor builds */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 20% 50%, hsl(260,60%,18%) 0%, hsl(260,40%,8%) 45%, hsl(220,50%,6%) 100%)"
      }} />
      {/* Decorative bokeh blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-[80px]" style={{ background: "hsl(270,70%,55%)" }} />
      <div className="absolute bottom-[-10%] left-[-15%] w-[55vw] h-[55vw] rounded-full opacity-15 blur-[100px]" style={{ background: "hsl(300,60%,45%)" }} />
      <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full opacity-10 blur-[60px]" style={{ background: "hsl(240,80%,70%)" }} />
      
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
            <span className="text-2xl font-bold text-white">SameVibe</span>
            <span className="hidden md:inline-block text-xs font-medium text-white/40 uppercase tracking-widest ml-2 mt-1">Discover Your Scene</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-white/70 hover:text-white transition-colors">Features</a>
            <a href="#community" className="text-white/70 hover:text-white transition-colors">Community</a>
            <a href="#events" className="text-white/70 hover:text-white transition-colors">Events</a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white hover:text-white/80" onClick={() => navigate("/login")}>
              Log In
            </Button>
            <Button className="bg-primary text-white hover:bg-primary/90 rounded-full px-6" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">
              Your Digital<br />Third Place
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-2xl mx-auto">
              Where genuine connection, shared passions, and meaningful community are always just around the corner.
            </p>
            
            {/* Call to Action */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Button 
                onClick={() => navigate("/signup")}
                className="bg-white text-black hover:bg-gray-100 px-8 py-6 rounded-full text-lg font-semibold h-auto"
              >
                Join SameVibe Free
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/login")}
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 rounded-full text-lg font-semibold h-auto"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-accent/20 rounded-xl mx-auto mb-4 flex items-center justify-center border border-accent/20">
              <Users className="text-accent h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Find Communities</h3>
            <p className="text-white/60 text-sm">Join interest-based groups near you</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-secondary/20 rounded-xl mx-auto mb-4 flex items-center justify-center border border-secondary/20">
              <Calendar className="text-secondary h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Discover Events</h3>
            <p className="text-white/60 text-sm">Local events within 50 miles</p>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-xl mx-auto mb-4 flex items-center justify-center border border-primary/20">
              <Heart className="text-primary h-6 w-6" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Give Kudos</h3>
            <p className="text-white/60 text-sm">Appreciate community members</p>
          </div>
        </div>
      </div>
      
      {/* PWA Installation Prompt */}
      <PWAInstall />

    </section>
  );
}
