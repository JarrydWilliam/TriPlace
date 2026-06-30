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
      const res = await fetch("/api/checkout/verify-revenuecat", {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold text-zinc-100">
            Expand Your Network
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            You've hit the limit of 3 free communities. Unlock more to continue expanding your TriPlace network!
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-3 p-4 border border-primary/50 rounded-xl bg-primary/5 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 p-4 bg-primary/20 rounded-full blur-xl w-24 h-24" />
            <div className="absolute top-0 right-0 p-2">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-primary">Add 1 Community</h3>
            </div>
            <p className="text-sm text-zinc-400">Unlock the ability to join another community to expand your network.</p>
            <div className="mt-2 flex items-center justify-between relative z-10">
              <span className="text-2xl font-bold text-white">$0.99</span>
              <Button 
                onClick={() => handleCheckout(1)}
                disabled={isPurchasing}
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[100px]"
              >
                {isPurchasing ? "Processing..." : "Purchase"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
