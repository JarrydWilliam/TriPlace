import { useAuth } from "@/hooks/use-auth";
// import { useTheme } from "@/lib/theme-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Logo } from "@/components/ui/logo";
import { Home, Compass, Users, MessageCircle, Heart, MapPin, Moon, Sun, Navigation } from "lucide-react";
import { Link, useLocation } from "wouter";

export function Sidebar() {
  const { user, signOut } = useAuth();
  // const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const { latitude, longitude, source, loading: locationLoading, locationName } = useGeolocation(user?.id);

  const navigationItems = [
    { 
      href: "/dashboard", 
      icon: Home, 
      label: "Home Feed", 
      active: location === "/dashboard" 
    },
    { 
      href: "/discover", 
      icon: Compass, 
      label: "Discover Events", 
      active: location === "/discover" 
    },
    { 
      href: "/communities", 
      icon: Users, 
      label: "My Communities", 
      active: location === "/communities",
      badge: "3"
    },
    { 
      href: "/messages", 
      icon: MessageCircle, 
      label: "Messages", 
      active: location === "/messages",
      badge: "2"
    },
    { 
      href: "/kudos", 
      icon: Heart, 
      label: "Kudos Received", 
      active: location === "/kudos" 
    },
  ];

  if (!user) return null;

  return (
    <aside className="hidden md:flex md:w-64 glass-panel flex-col border-r-0 h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <Logo size="md" />
          <span className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">TriPlace</span>
        </div>

        {/* User Profile Preview - Glass Card */}
        <div className="glass-card rounded-xl p-4 mb-6 group cursor-pointer">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12 ring-2 ring-white/10">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback className="bg-primary/20 text-white backdrop-blur-sm">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white truncate group-hover:text-primary transition-colors">
                {user.name}
              </p>
              <div className="flex items-center gap-1 text-white/50 text-xs">
                {locationLoading ? (
                  <>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span>Locating...</span>
                  </>
                ) : latitude && longitude ? (
                  <>
                    {source === 'gps' ? (
                      <Navigation className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <MapPin className="w-3 h-3 text-amber-400" />
                    )}
                    <span className="truncate">
                      {locationName || 'San Francisco, CA'}
                    </span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3 text-white/30" />
                    <span>SF Bay Area</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <a className={`
                  flex items-center space-x-3 rounded-xl py-3 px-4 font-medium transition-all duration-300
                  ${item.active 
                    ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
                    : 'text-white/60 hover:text-white hover:bg-white/5 hover:translate-x-1'
                  }
                `}>
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="bg-primary text-white text-xs border-0">
                      {item.badge}
                    </Badge>
                  )}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-6 border-t border-white/5">
        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full text-white/50 hover:bg-white/5 hover:text-white transition-colors justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
