import { useIsMobile } from "@/hooks/use-mobile";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Messaging() {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden pb-16 md:pb-0">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-7000" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-10000" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 pt-12 pb-4 md:pt-8 md:px-8 border-b border-white/5 bg-background/50 backdrop-blur-xl">
        <h1 className="text-3xl font-black text-foreground tracking-tight">Messages</h1>
        <p className="text-muted-foreground mt-1">Connect with your groups</p>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <MessageCircle className="w-16 h-16 text-primary/40 mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-3">Group-First Messaging</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
          Join a community, activity, or SameVibe event group to start a conversation.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Button 
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-semibold"
            onClick={() => window.location.href = "/"}
          >
            Browse Communities
          </Button>
          <Button 
            variant="outline"
            className="flex-1 border-white/10 hover:bg-white/5 h-12 rounded-xl font-semibold text-foreground"
            onClick={() => window.location.href = "/events"}
          >
            View Upcoming Events
          </Button>
        </div>
      </main>

      {isMobile && <MobileNav />}
    </div>
  );
}
