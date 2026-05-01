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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/telemetry";
import { useEffect } from "react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onVerified: () => void;
}

export function VerificationModal({ isOpen, onClose, userId, onVerified }: VerificationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      trackEvent('verification_start', { userId });
    }
  }, [isOpen, userId]);

  // For MVP, we simulate sending a code and verifying
  const handleSendCode = () => {
    if (phone.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setStep("code");
      toast({
        title: "Code Sent",
        description: "Please check your messages for the verification code.",
      });
    }, 1000);
  };

  const verifyMutation = useMutation({
    mutationFn: async () => {
      // Simulate checking the code, then update user's trust level
      const response = await apiRequest("PATCH", `/api/users/${userId}`, {
        trustLevel: 1,
      });
      return response.json();
    },
    onSuccess: () => {
      trackEvent('verification_success', { userId });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}`] });
      toast({
        title: "Phone Verified!",
        description: "Your trust level has been increased. You can now RSVP to events.",
      });
      onVerified();
      onClose();
      // Reset for future
      setTimeout(() => setStep("phone"), 500);
    },
    onError: () => {
      trackEvent('verification_failed', { userId });
      toast({
        title: "Verification Failed",
        description: "Invalid code or connection error. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVerifyCode = () => {
    const isBetaSimulation = import.meta.env.VITE_ENABLE_BETA_SMS_SIMULATION === 'true';

    if (import.meta.env.DEV || isBetaSimulation) {
      if (code !== "123456") {
        toast({
          title: "Invalid Code",
          description: `For ${import.meta.env.DEV ? 'development' : 'beta testing'}, use code 123456.`,
          variant: "destructive",
        });
        return;
      }
      if (isBetaSimulation && !import.meta.env.DEV) {
          trackEvent('verification_beta_simulated', { userId });
      }
      verifyMutation.mutate();
    } else {
      // Production mode does not allow fake verification bypass
      toast({
        title: "Verification Unavailable",
        description: "SMS Verification is currently disabled.",
        variant: "destructive",
      });
      return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Your Profile</DialogTitle>
          <DialogDescription>
            To keep meetups real and reduce fake accounts, please verify your phone number before RSVPing. Your phone number will not be shown on your profile.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === "phone" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <Button
                className="w-full bg-primary"
                onClick={handleSendCode}
                disabled={isSubmitting || !phone}
              >
                {isSubmitting ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                />
                {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_BETA_SMS_SIMULATION === 'true') && (
                  <p className="text-xs text-muted-foreground mt-2">
                    (Simulated: use code 123456)
                  </p>
                )}
              </div>
              <Button
                className="w-full bg-primary"
                onClick={handleVerifyCode}
                disabled={verifyMutation.isPending || !code}
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("phone")}
                disabled={verifyMutation.isPending}
              >
                Back to Phone Number
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
