import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/lib/theme-context";
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
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const { latitude, longitude, source, loading: locationLoading, locationName } = useGeolocation();

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
    <aside className="hidden md:flex md:w-64 bg-gray-800 border-r border-gray-700 flex-col dark:bg-gray-800 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <Logo size="md" />
          <span className="text-xl font-bold text-white dark:text-white">TriPlace</span>
        </div>

        {/* User Profile Preview */}
        <div className="bg-gray-750 dark:bg-gray-750 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback className="bg-primary text-white">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white dark:text-white truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-400 text-xs">
                {locationLoading ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Getting location...</span>
                  </>
                ) : latitude && longitude ? (
                  <>
                    {source === 'gps' ? (
                      <Navigation className="w-3 h-3 text-green-500" />
                    ) : (
                      <MapPin className="w-3 h-3 text-yellow-500" />
                    )}
                    <span className="truncate">
                      {locationName || (source === 'gps' ? 'Precise location' : 'Approximate location')}
                    </span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3 text-gray-500" />
                    <span>Location not available</span>
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
                  flex items-center space-x-3 rounded-xl py-3 px-4 font-medium transition-all
                  ${item.active 
                    ? 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700'
                  }
                `}>
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="bg-accent text-white text-xs">
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
      <div className="mt-auto p-6 border-t border-gray-700 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-400">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="text-sm">Dark Mode</span>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={toggleTheme}
            className="data-[state=checked]:bg-primary"
          />
        </div>
        
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
