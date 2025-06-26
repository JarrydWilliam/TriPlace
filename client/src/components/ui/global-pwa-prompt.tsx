import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Smartphone, Monitor, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function GlobalPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'desktop' | 'mobile' | 'unknown'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is running as PWA (standalone mode)
    const isRunningStandalone = () => {
      return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    };

    // Check if app is already installed
    const checkInstalled = () => {
      if (isRunningStandalone()) {
        setIsInstalled(true);
        return true;
      }
      
      // Check if installed via navigator (only in top-level browsing context)
      if (window.self === window.top && 'getInstalledRelatedApps' in navigator) {
        try {
          (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
            if (apps.length > 0) {
              setIsInstalled(true);
            }
          }).catch(() => {
            // Silently fail if API not supported
          });
        } catch (error) {
          // Silently fail if API not available in iframe/embedded context
        }
      }
      return false;
    };

    // Detect platform
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
        setPlatform('mobile');
      } else {
        setPlatform('desktop');
      }
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('Before install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install dialog after a short delay if not running as PWA
      if (!isRunningStandalone()) {
        setTimeout(() => {
          if (!isInstalled) {
            setShowInstallDialog(true);
          }
        }, 2000);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallDialog(false);
      toast({
        title: "App Installed!",
        description: "TriPlace has been added to your device. Launch it anytime from your home screen.",
      });
    };

    const alreadyInstalled = checkInstalled();
    detectPlatform();
    
    // Only show prompt if running in browser (not standalone PWA)
    if (!alreadyInstalled && !isRunningStandalone()) {
      // Check if user has previously dismissed the prompt
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const lastDismissed = dismissed ? parseInt(dismissed) : 0;
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
      
      if (!dismissed || lastDismissed < sixHoursAgo) {
        const timer = setTimeout(() => {
          console.log('Showing install dialog fallback');
          setShowInstallDialog(true);
        }, 5000);
        
        // Clear timer if beforeinstallprompt fires
        const clearTimer = () => clearTimeout(timer);
        window.addEventListener('beforeinstallprompt', clearTimer);
        
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', clearTimer);
        };
      }
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, toast]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support PWA installation
      toast({
        title: "Add to Home Screen",
        description: platform === 'mobile' 
          ? "Tap the share button in your browser and select 'Add to Home Screen'"
          : "Use your browser's 'Install App' option or bookmark this page",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallDialog(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: "Installation Error",
        description: "Failed to install the app. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('safari') && userAgent.includes('iphone')) {
      return "Tap the Share button, then 'Add to Home Screen'";
    } else if (userAgent.includes('safari') && userAgent.includes('ipad')) {
      return "Tap the Share button, then 'Add to Home Screen'";
    } else if (userAgent.includes('chrome') && platform === 'mobile') {
      return "Tap the menu (⋮) and select 'Add to Home Screen'";
    } else if (userAgent.includes('firefox') && platform === 'mobile') {
      return "Tap the menu and select 'Install'";
    } else {
      return "Look for the 'Install App' option in your browser's address bar";
    }
  };

  // Don't show if already installed or running as PWA
  if (isInstalled || window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  return (
    <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {platform === 'mobile' ? (
                <Smartphone className="w-6 h-6 text-primary" />
              ) : (
                <Monitor className="w-6 h-6 text-primary" />
              )}
              <DialogTitle>Install TriPlace</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowInstallDialog(false);
                localStorage.setItem('pwa-install-dismissed', Date.now().toString());
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            Get the full TriPlace experience with our app! Access your digital third place instantly from your {platform === 'mobile' ? 'home screen' : 'desktop'}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Fast Access</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Launch directly from your {platform === 'mobile' ? 'home screen' : 'desktop'}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Offline Ready</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Stay connected even without internet</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {deferredPrompt ? (
              <Button
                onClick={handleInstall}
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Install TriPlace
              </Button>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getInstallInstructions()}
                </p>
                <Button
                  onClick={() => {
                    setShowInstallDialog(false);
                    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Got it!
                </Button>
              </div>
            )}
            
            <Button
              variant="ghost"
              onClick={() => {
                setShowInstallDialog(false);
                localStorage.setItem('pwa-install-dismissed', Date.now().toString());
              }}
              className="w-full text-sm"
            >
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}