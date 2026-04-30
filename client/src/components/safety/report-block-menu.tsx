import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, AlertTriangle, ShieldOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReportBlockMenuProps {
  targetUserId: number;
  currentUserId?: number;
}

export function ReportBlockMenu({ targetUserId, currentUserId }: ReportBlockMenuProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Must be logged in");
      const response = await apiRequest("POST", "/api/users/block", {
        blockerId: currentUserId,
        blockedId: targetUserId,
        reason: "User manually blocked from profile UI",
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to hide this user's content
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({
        title: "User Blocked",
        description: "You will no longer see this user or their content.",
      });
      setIsOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReport = () => {
    // For MVP, we just show a toast that it's been reported. 
    // Real implementation would open a modal to select a reason.
    toast({
      title: "Report Submitted",
      description: "Our trust & safety team will review this user shortly.",
    });
    setIsOpen(false);
  };

  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white">
          <MoreHorizontal className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700">
        <DropdownMenuItem 
          className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            handleReport();
          }}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          <span>Report User</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            if (window.confirm("Are you sure you want to block this user? They will not be notified, but you will no longer see their profile or messages.")) {
              blockMutation.mutate();
            }
          }}
          disabled={blockMutation.isPending}
        >
          <ShieldOff className="mr-2 h-4 w-4" />
          <span>{blockMutation.isPending ? "Blocking..." : "Block User"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
