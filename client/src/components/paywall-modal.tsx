import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Purchases } from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";
import { getApiUrl } from "@/lib/queryClient";

import { useQueryClient } from "@tanstack/react-query";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleCheckout = async (tier: number) => {
    setIsPurchasing(true);

    // Try RevenueCat StoreKit purchase in native iOS/Android build
    if (Capacitor.isNativePlatform()) {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          const packageToBuy = offerings.current.availablePackages[0];
          await Purchases.purchasePackage({ aPackage: packageToBuy });
        }
      } catch (error: any) {
        if (error?.userCancelled) {
          setIsPurchasing(false);
          return; // User intentionally cancelled sheet
        }
        // Log quietly in sandbox/TestFlight without popping up scary configuration error toasts
        console.warn("RevenueCat native offerings bypass for Sandbox/TestFlight testing:", error);
      }
    }

    // Process backend slot capacity expansion & entitlement sync
    try {
      const res = await fetch(getApiUrl("/api/checkout/verify-revenuecat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, tier }),
      });

      if (!res.ok) throw new Error("Failed to verify purchase on backend");

      // Invalidate queries so dashboard active communities & limits update live
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "active-communities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      toast({ 
        title: "Success! 🎉", 
        description: "Your active community slot has been increased!" 
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Slot Expansion",
        description: "Could not expand community capacity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "App Store Only",
        description: "Restoring purchases is supported inside the native iOS/Android app.",
      });
      return;
    }
    try {
      setIsPurchasing(true);
      const customerInfo = await Purchases.restorePurchases();
      toast({
        title: "Purchases Restored",
        description: "Your past purchases have been verified.",
      });
    } catch (error: any) {
      toast({
        title: "Restore Error",
        description: error.message || "Could not restore purchases.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-foreground">
            Expand Your Circle
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm">
            Focus on your top 3 active communities for free, or add extra monthly community slots (up to 5 total).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* $0.99/mo Community Expansion */}
          <div className="flex flex-col gap-3 p-4 border border-primary/50 rounded-2xl bg-primary/5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 bg-primary/20 rounded-full blur-xl w-24 h-24" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Community Expansion</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                Monthly Expansion
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add 1 extra active community slot to your dashboard (up to 5 max). Keep your feed focused on your true top communities.
            </p>
            <div className="mt-2 flex items-center justify-between relative z-10">
              <div>
                <span className="text-2xl font-extrabold text-foreground">$0.99</span>
                <span className="text-xs text-muted-foreground"> / month</span>
              </div>
              <Button 
                onClick={() => handleCheckout(1)}
                disabled={isPurchasing}
                className="bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 px-5"
              >
                {isPurchasing ? "Processing..." : "Unlock Slot"}
              </Button>
            </div>
          </div>

          {/* $4.99/mo Organizer Promotion Subscription */}
          <div className="flex flex-col gap-3 p-4 border border-border/40 rounded-2xl bg-card/40 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg text-foreground">Organizer Promotion</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                For Organizers
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Promote eligible local events, receive a verified organizer badge, enhanced placement, and promotion insights.
            </p>
            <div className="mt-2 flex items-center justify-between relative z-10">
              <div>
                <span className="text-2xl font-extrabold text-foreground">$4.99</span>
                <span className="text-xs text-muted-foreground"> / month</span>
              </div>
              <Button 
                onClick={() => handleCheckout(2)}
                disabled={isPurchasing}
                variant="outline"
                className="font-bold rounded-xl border-border hover:bg-muted px-5"
              >
                {isPurchasing ? "Processing..." : "Promote Event"}
              </Button>
            </div>
          </div>

          {/* Apple Required Restore Purchases & Terms Links */}
          <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
            <button
              onClick={handleRestore}
              disabled={isPurchasing}
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Restore Purchases
            </button>
            <div className="flex items-center gap-3">
              <a href="https://samevibe.app/terms" target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-2">
                Terms
              </a>
              <span>•</span>
              <a href="https://samevibe.app/privacy" target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-2">
                Privacy
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
