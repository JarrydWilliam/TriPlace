import { Home, Search, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    icon: Home,
    label: "Home",
    activePattern: /^\/dashboard$/
  },
  {
    href: "/dashboard#communities",
    icon: Search,
    label: "Discover",
    activePattern: /^\/dashboard.*communities/
  },
  {
    href: "/messaging",
    icon: MessageCircle,
    label: "Messages",
    activePattern: /^\/messaging/
  },
  {
    href: "/profile",
    icon: User,
    label: "Profile",
    activePattern: /^\/profile/
  }
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.activePattern.test(location);
          
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors min-w-[60px]",
                isActive 
                  ? "text-orange-500 dark:text-cyan-400 bg-orange-50 dark:bg-cyan-950" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}>
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}