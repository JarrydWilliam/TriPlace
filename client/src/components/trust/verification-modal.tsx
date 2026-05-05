import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/telemetry";
import { useEffect } from "react";
import { Calendar, ExternalLink, Clock } from "lucide-react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onVerified: () => void;
  /** If provided, shown as the external source link for the event */
  eventSourceUrl?: string;
  /** Display name of the source platform (e.g. "Eventbrite") */
  eventSourceName?: string;
}

export function VerificationModal({
  isOpen,
  onClose,
  userId,
  onVerified,
  eventSourceUrl,
  eventSourceName,
}: VerificationModalProps) {

  useEffect(() => {
    if (isOpen) {
      trackEvent("verification_start", { userId });
    }
  }, [isOpen, userId]);

  const handleOpenSource = () => {
    if (eventSourceUrl) {
      trackEvent("external_source_click", { userId, source: eventSourceName });
      window.open(eventSourceUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-3">
            <Clock className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center">RSVP Coming Soon</DialogTitle>
          <DialogDescription className="text-center">
            In-app RSVP is coming in a future update. In the meantime, you can register directly on the original event page.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-sm text-muted-foreground text-center">
            <Calendar className="w-4 h-4 inline mr-1.5 opacity-70" />
            SameVibe does not sell tickets or process payments. You will be taken to{" "}
            <span className="font-medium text-foreground">
              {eventSourceName ?? "the event source"}
            </span>{" "}
            to complete your registration.
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Not Now
          </Button>
          {eventSourceUrl ? (
            <Button onClick={handleOpenSource} className="flex-1 gap-2">
              <ExternalLink className="w-4 h-4" />
              Register on {eventSourceName ?? "Source"}
            </Button>
          ) : (
            <Button onClick={onClose} className="flex-1">
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
