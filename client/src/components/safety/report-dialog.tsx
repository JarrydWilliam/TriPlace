import React, { useState } from "react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const REPORT_REASONS = {
  user: [
    { value: "harassment", label: "Harassment or bullying" },
    { value: "spam", label: "Spam or fake account" },
    { value: "fake_profile", label: "Impersonation / fake profile" },
    { value: "inappropriate_content", label: "Inappropriate content" },
    { value: "other", label: "Other" },
  ],
  event: [
    { value: "misleading", label: "Misleading information" },
    { value: "spam", label: "Spam or fake event" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "safety_concern", label: "Safety concern" },
    { value: "other", label: "Other" },
  ],
  community: [
    { value: "harassment", label: "Harassment" },
    { value: "spam", label: "Spam" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "other", label: "Other" },
  ],
  post: [
    { value: "harassment", label: "Harassment" },
    { value: "spam", label: "Spam" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "other", label: "Other" },
  ],
  message: [
    { value: "harassment", label: "Harassment" },
    { value: "spam", label: "Spam" },
    { value: "phishing", label: "Phishing or malicious link" },
    { value: "other", label: "Other" },
  ],
};

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "user" | "event" | "community" | "post" | "message";
  targetId: number;
}

export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const reasons = REPORT_REASONS[targetType] || REPORT_REASONS.user;

  const reportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/reports`, {
        targetType,
        targetId,
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
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetType.charAt(0).toUpperCase() + targetType.slice(1)}</DialogTitle>
          <DialogDescription>
            Help us keep SameVibe safe. Select a reason and our team will review this report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason</Label>
            <div className="space-y-2">
              {reasons.map((reason) => (
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
              onOpenChange(false);
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
  );
}
