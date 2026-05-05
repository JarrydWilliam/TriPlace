import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, AlertTriangle, ShieldOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "spam", label: "Spam or fake account" },
  { value: "fake_profile", label: "Impersonation / fake profile" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

interface ReportBlockMenuProps {
  targetUserId: number;
  currentUserId?: number;
}

export function ReportBlockMenu({ targetUserId, currentUserId }: ReportBlockMenuProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

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
      queryClient.invalidateQueries({ queryKey: ["/api/communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "User Blocked",
        description: "You will no longer see this user or their content.",
      });
      setIsDropdownOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Must be logged in");
      const response = await apiRequest("POST", `/api/users/${targetUserId}/report`, {
        reporterId: currentUserId,
        reason: selectedReason,
        details: reportDetails.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Our trust & safety team will review this report. Thank you for keeping SameVibe safe.",
      });
      setIsReportDialogOpen(false);
      setSelectedReason("");
      setReportDetails("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
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
              setIsDropdownOpen(false);
              setIsReportDialogOpen(true);
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Report User</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              if (
                window.confirm(
                  "Are you sure you want to block this user? They will not be notified, but you will no longer see their profile or messages."
                )
              ) {
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

      {/* Report Reason Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Help us keep SameVibe safe. Select a reason and our team will review this report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                      selectedReason === reason.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-details">Additional details (optional)</Label>
              <Textarea
                id="report-details"
                placeholder="Describe what happened..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsReportDialogOpen(false);
                setSelectedReason("");
                setReportDetails("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => reportMutation.mutate()}
              disabled={!selectedReason || reportMutation.isPending}
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
