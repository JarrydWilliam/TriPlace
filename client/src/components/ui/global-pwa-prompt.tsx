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

// Type declarations for WebView detection
declare global {
  interface Window {
    ReactNativeWebView?: any;
    webkit?: {
      messageHandlers?: any;
    };
  }
}

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
    // Check if running inside mobile app WebView
    const isInMobileApp = () => {
      // Check for mobile app indicators
      if (localStorage.getItem('mobile-app') === 'true') {
        return true;
      }
      
      // Check for WebView user agents
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('wv') || // Android WebView
          userAgent.includes('triplace') || // Custom mobile app identifier
          window.ReactNativeWebView || // React Native WebView
          window.webkit?.messageHandlers) { // iOS WebView
        return true;
      }
      
      return false;
    };

    // Check if app is running as PWA (standalone mode)
    const isRunningStandalone = () => {
      return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    };

    // Don't show any prompts if running in mobile app
    if (isInMobileApp()) {
      setIsInstalled(true);
      return;
    }

    // Check if app is already installed
    const checkInstalled = () => {
      if (isRunningStandalone()) {
        setIsInstalled(true);
        return true;
      }
      
      // Check localStorage for previous installation
      const wasInstalled = localStorage.getItem('pwa-installed');
      if (wasInstalled === 'true') {
        setIsInstalled(true);
        return true;
      }
      
      return false;
    };

    // Detect platform with enhanced iOS detection
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
        setPlatform('mobile');
      } else {
        setPlatform('desktop');
      }
    };

    // Enhanced iOS Safari detection
    const isIOSSafari = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      return (userAgent.includes('safari') && 
              (userAgent.includes('iphone') || userAgent.includes('ipad')) &&
              !userAgent.includes('chrome') &&
              !userAgent.includes('firefox'));
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
      localStorage.setItem('pwa-installed', 'true');
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
        // iOS Safari needs immediate prompt since beforeinstallprompt doesn't fire
        if (isIOSSafari()) {
          const timer = setTimeout(() => {
            console.log('Showing iOS Safari install dialog');
            setShowInstallDialog(true);
          }, 2000); // Shorter delay for iOS
          
          return () => clearTimeout(timer);
        } else {
          // Other browsers - wait for beforeinstallprompt or show fallback
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
      // Enhanced mobile installation handling
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        // iOS devices - show enhanced visual instructions
        toast({
          title: "📱 Install TriPlace App",
          description: "Tap the Share button (⬆️) → Scroll down → Tap 'Add to Home Screen' → Tap 'Add'",
          duration: 10000
        });
      } else if (userAgent.includes('android')) {
        // Android devices - improved installation handling
        if (userAgent.includes('chrome')) {
          // Create a proper installation trigger for Android Chrome
          const installEvent = new CustomEvent('beforeinstallprompt');
          window.dispatchEvent(installEvent);
          
          // Show user-friendly instructions
          setTimeout(() => {
            toast({
              title: "Install Available",
              description: "Look for the 'Install' option in your browser menu (⋮) or address bar",
              duration: 5000
            });
          }, 1000);
        }
        
        toast({
          title: "Install TriPlace",
          description: "Tap the menu (⋮) in your browser, then 'Add to Home screen' or 'Install app'",
          duration: 6000
        });
      } else {
        // Other mobile browsers
        toast({
          title: "Add to Home Screen",
          description: "Use your browser's menu to add TriPlace to your home screen for quick access",
        });
      }
      
      setShowInstallDialog(false);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallDialog(false);
        localStorage.setItem('pwa-installed', 'true');
        toast({
          title: "Installing App...",
          description: "TriPlace is being added to your device. You'll see it on your home screen shortly.",
        });
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
      return "1. Tap the Share button (⬆️) at the bottom of Safari\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to install TriPlace";
    } else if (userAgent.includes('safari') && userAgent.includes('ipad')) {
      return "1. Tap the Share button (⬆️) in Safari\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to install TriPlace";
    } else if (userAgent.includes('chrome') && platform === 'mobile') {
      return "Tap the menu (⋮) and select 'Add to Home Screen'";
    } else if (userAgent.includes('firefox') && platform === 'mobile') {
      return "Tap the menu and select 'Install'";
    } else {
      return "Look for the 'Install App' option in your browser's address bar";
    }
  };

  // Enhanced detection for mobile app WebView
  const isInMobileAppWebView = () => {
    // Check localStorage flag set by mobile app
    if (localStorage.getItem('mobile-app') === 'true') {
      return true;
    }
    
    // Check for React Native WebView
    if (window.ReactNativeWebView) {
      return true;
    }
    
    // Check user agent for WebView indicators
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('wv') || 
        userAgent.includes('triplace') ||
        userAgent.includes('expo')) {
      return true;
    }
    
    // Check for iOS WebView
    if (window.webkit?.messageHandlers) {
      return true;
    }
    
    return false;
  };

  // Don't show if already installed, running as PWA, or in mobile app
  if (isInstalled || 
      window.matchMedia('(display-mode: standalone)').matches ||
      isInMobileAppWebView()) {
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