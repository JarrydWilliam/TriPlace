import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Crown, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCheckout = async (tier: number) => {
    try {
      const res = await fetch("/api/checkout/community-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, tier }),
      });

      if (!res.ok) throw new Error("Failed to create checkout session");

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not start checkout. Please try again.",
        variant: "destructive",
      });
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
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Purchase
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
