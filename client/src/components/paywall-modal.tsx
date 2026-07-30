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

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleCheckout = async (tier: number) => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "App Store Only",
        description: "Purchases are only supported inside the native iOS/Android app.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPurchasing(true);
      // Fetch available packages from RevenueCat
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering || currentOffering.availablePackages.length === 0) {
        throw new Error("No products available currently.");
      }

      // We purchase the first available package
      const packageToBuy = currentOffering.availablePackages[0];
      await Purchases.purchasePackage({ aPackage: packageToBuy });

      // After successful native purchase, verify with our backend to grant the capacity
      const res = await fetch(getApiUrl("/api/checkout/verify-revenuecat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, tier }),
      });

      if (!res.ok) throw new Error("Failed to verify purchase on backend");
      
      toast({ title: "Success! 🎉", description: "Your community capacity has been increased!" });
      onOpenChange(false);
    } catch (error: any) {
      if (error.userCancelled) return; // User simply closed the payment sheet
      toast({
        title: "Purchase Error",
        description: error.message || "Could not complete purchase. Please try again.",
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
            Add more active community space to your SameVibe dashboard. One-time purchase. No subscription.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* $0.99 One-Time Community Expansion */}
          <div className="flex flex-col gap-3 p-4 border border-primary/50 rounded-2xl bg-primary/5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 bg-primary/20 rounded-full blur-xl w-24 h-24" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Community Expansion</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                One-Time Purchase
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add 1 extra active community slot to your dashboard (up to 5 total). One-time payment, no recurring subscription.
            </p>
            <div className="mt-2 flex items-center justify-between relative z-10">
              <div>
                <span className="text-2xl font-extrabold text-foreground">$0.99</span>
                <span className="text-xs text-muted-foreground"> one-time</span>
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
