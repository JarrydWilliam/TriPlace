import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Home, Compass, Users, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "wouter";

export function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigationItems = [
    { 
      href: "/dashboard", 
      icon: Home, 
      label: "Home",
      active: location === "/dashboard"
    },
    { 
      href: "/discover", 
      icon: Compass, 
      label: "Discover",
      active: location === "/discover"
    },
    { 
      href: "/communities", 
      icon: Users, 
      label: "Communities",
      active: location === "/communities"
    },
    { 
      href: "/messages", 
      icon: MessageCircle, 
      label: "Messages",
      active: location === "/messages",
      badge: "2"
    },
    { 
      href: "/profile", 
      icon: User, 
      label: "Profile",
      active: location === "/profile"
    },
  ];

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-50 md:hidden dark:bg-gray-800 dark:border-gray-700">
      <div className="flex justify-around items-center py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a className={`
                flex flex-col items-center py-2 px-3 relative transition-colors
                ${item.active 
                  ? 'text-primary dark:text-primary' 
                  : 'text-gray-400 dark:text-gray-400'
                }
              `}>
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 w-4 h-4 p-0 bg-accent text-white text-xs flex items-center justify-center"
                  >
                    {item.badge}
                  </Badge>
                )}
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
