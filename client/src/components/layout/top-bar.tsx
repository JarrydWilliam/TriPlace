import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Search, Bell } from "lucide-react";

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (!user) return null;

  return (
    <header className="glass-panel border-b border-white/10 p-4 md:p-6 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search events, communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-white/40 focus:border-primary glass-input"
            />
          </form>
        </div>
        
        <div className="flex items-center space-x-4 ml-4">
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-white/60 hover:text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 w-4 h-4 p-0 bg-accent text-white text-xs flex items-center justify-center"
            >
              3
            </Badge>
          </Button>
          
          <div className="md:hidden">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback className="bg-primary text-white text-sm">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
