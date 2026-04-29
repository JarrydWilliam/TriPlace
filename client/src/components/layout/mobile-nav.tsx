import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Home, Compass, Users, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

export function MobileNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Fetch real unread message count
  const { data: conversations } = useQuery({
    queryKey: ["/api/users", user?.id, "conversations"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.id}/conversations`);
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000, // poll every 30s for new messages
  });

  const unreadCount = Array.isArray(conversations)
    ? conversations.filter((c: any) => c.lastMessage && !c.lastMessage.isRead && c.lastMessage.receiverId === user?.id).length
    : 0;

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
      badge: unreadCount > 0 ? String(unreadCount > 99 ? "99+" : unreadCount) : undefined,
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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "hsl(var(--card))",
        borderTop: "1px solid hsl(var(--border))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a className={`
                flex flex-col items-center py-2 px-3 relative transition-colors min-w-[48px]
                ${item.active 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
                }
              `}>
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 right-0 min-w-[18px] h-[18px] p-0 bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center rounded-full"
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
