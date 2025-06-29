import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, RefreshCw } from "lucide-react";
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
          console.log('[App] Service worker registered');
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
                  console.log('[App] New service worker installed, update available');
                  setUpdateAvailable(true);
                  toast({
                    title: "Update Available",
                    description: "A new version of TriPlace is ready to install.",
                  });
                }
              });
            }
          });

          // Listen for controller change (when new SW takes control)
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[App] Service worker controller changed, reloading page');
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error('[App] Service worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[App] Message from service worker:', event.data);
        
        if (event.data?.type === 'SW_UPDATED') {
          setUpdateAvailable(true);
          toast({
            title: "App Updated",
            description: "TriPlace has been updated in the background.",
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>App Update Available</DialogTitle>
              <DialogDescription>
                A new version of TriPlace is ready to install with the latest features and improvements.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                  What's New
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Enhanced performance, bug fixes, and improved community matching features.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1"
              size="lg"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Update Now
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-1"
              size="lg"
            >
              Later
            </Button>
          </div>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Updates are automatically downloaded and installed in the background for the best experience.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}