import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          setServiceWorkerRegistration(registration);

          // Check for updates immediately
          registration.update();

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Listen for waiting service worker
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                  toast({
                    title: "Update Available",
                    description: "A new version of SameVibe is ready to install.",
                  });
                }
              });
            }
          });

          // Listen for controller change (when new SW takes control)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error('[App] Service worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        
        if (event.data?.type === 'SW_UPDATED') {
          setUpdateAvailable(true);
          toast({
            title: "App Updated",
            description: "SameVibe has been updated in the background.",
          });
        }
        
        if (event.data?.type === 'FORCE_UPDATE') {
          handleUpdate();
        }
      });
    }
  }, [toast]);

  const handleUpdate = async () => {
    if (!serviceWorkerRegistration) return;

    setIsUpdating(true);
    
    try {
      const waitingWorker = serviceWorkerRegistration.waiting;
      
      if (waitingWorker) {
        // Tell the waiting service worker to skip waiting and become active
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        
        // Show updating toast
        toast({
          title: "Updating App",
          description: "Installing the latest version...",
        });
        
        // Wait for controller change and reload
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Force update check
        await serviceWorkerRegistration.update();
        window.location.reload();
      }
    } catch (error) {
      console.error('[App] Update failed:', error);
      toast({
        title: "Update Failed",
        description: "Unable to update the app. Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setUpdateAvailable(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <Dialog open={updateAvailable} onOpenChange={setUpdateAvailable}>
      <DialogContent className="max-w-md bg-[#050d1a]/95 border border-cyan-500/30 backdrop-blur-2xl text-white rounded-3xl p-6 shadow-2xl shadow-cyan-500/20">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-cyan-500/20 border border-cyan-400/30 rounded-2xl flex items-center justify-center text-cyan-300 shadow-inner">
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">SameVibe Sync Update</DialogTitle>
              <DialogDescription className="text-xs text-cyan-200/70">
                Fresh app improvements and live community updates are ready.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="bg-cyan-950/40 border border-cyan-500/20 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <RefreshCw className="w-5 h-5 text-cyan-400 mt-0.5 animate-spin-slow" />
              <div className="space-y-1">
                <p className="font-semibold text-xs text-white">
                  Live Features & Sync Performance
                </p>
                <p className="text-[11px] text-cyan-200/70 leading-relaxed">
                  Includes enhanced community matching, faster messaging sync, and performance optimizations.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-1">
            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl h-11 text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-1 text-white/70 hover:text-white hover:bg-white/10 border border-white/15 rounded-xl h-11 text-xs font-semibold"
            >
              Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
