import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Home, Compass, Users, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { hapticLight } from "@/lib/haptics";

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
      active: location === "/dashboard" || location === "/"
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
      label: "My Groups",
      active: location === "/communities"
    },
    { 
      href: "/messages", 
      icon: MessageCircle, 
      label: "Messages",
      active: location === "/messages" || location === "/messaging",
      badge: unreadCount > 0 ? String(unreadCount > 99 ? "99+" : unreadCount) : undefined,
    },
    { 
      href: "/profile", 
      icon: User, 
      label: "Profile",
      active: location === "/profile" || location.startsWith("/profile/")
    },
  ];

  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "rgba(8, 6, 18, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <a
                className="flex flex-col items-center py-2 px-3 relative transition-colors min-w-[52px]"
              >
                {/* Animated active pill indicator */}
                {item.active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl bg-white/10"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                  />
                )}

                <div className="relative z-10">
                  <Icon
                    className={`h-5 w-5 mb-1 transition-all duration-300 ${
                      item.active
                        ? "text-[#ff6b35] scale-110"
                        : "text-white/40"
                    }`}
                  />
                </div>

                <span
                  className={`text-[10px] font-medium z-10 transition-colors duration-300 ${
                    item.active ? "text-[#ff6b35]" : "text-white/30"
                  }`}
                >
                  {item.label}
                </span>

                {/* Unread badge */}
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="absolute top-0 right-1 min-w-[16px] h-[16px] p-0 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-0"
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
