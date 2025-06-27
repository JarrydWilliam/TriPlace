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

// Type declarations for WebView detection and Chrome APIs
declare global {
  interface Window {
    ReactNativeWebView?: any;
    webkit?: {
      messageHandlers?: any;
    };
    chrome?: {
      webstore?: any;
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

  // Enhanced mobile browser detection function
  const getMobileBrowserType = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      if (userAgent.includes('crios')) return 'ios-chrome';
      if (userAgent.includes('fxios')) return 'ios-firefox';
      if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'ios-safari';
      return 'ios-other';
    }
    
    if (userAgent.includes('android')) {
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'android-chrome';
      if (userAgent.includes('firefox')) return 'android-firefox';
      if (userAgent.includes('samsung')) return 'android-samsung';
      if (userAgent.includes('opera')) return 'android-opera';
      return 'android-other';
    }
    
    return 'desktop';
  };

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

    const browserType = getMobileBrowserType();
    const isMobileBrowser = browserType !== 'desktop';

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
        // Mobile browsers need different handling strategies
        if (isMobileBrowser) {
          let promptDelay = 3000; // Default mobile delay
          
          // iOS browsers don't support beforeinstallprompt, show immediately
          if (browserType.startsWith('ios')) {
            promptDelay = 2000;
          }
          
          const timer = setTimeout(() => {
            console.log(`Showing install dialog for ${browserType}`);
            setShowInstallDialog(true);
          }, promptDelay);
          
          // Only Android Chrome supports beforeinstallprompt reliably
          if (browserType === 'android-chrome') {
            const clearTimer = () => clearTimeout(timer);
            window.addEventListener('beforeinstallprompt', clearTimer);
            
            return () => {
              clearTimeout(timer);
              window.removeEventListener('beforeinstallprompt', clearTimer);
            };
          }
          
          return () => clearTimeout(timer);
        } else {
          // Desktop browsers - wait for beforeinstallprompt or show fallback
          const timer = setTimeout(() => {
            console.log('Showing install dialog fallback');
            setShowInstallDialog(true);
          }, 5000);
          
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

  // Helper function for browser detection used in multiple places
  const getMobileBrowserTypeForHandling = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      if (userAgent.includes('crios')) return 'ios-chrome';
      if (userAgent.includes('fxios')) return 'ios-firefox';
      if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'ios-safari';
      return 'ios-other';
    }
    
    if (userAgent.includes('android')) {
      if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'android-chrome';
      if (userAgent.includes('firefox')) return 'android-firefox';
      if (userAgent.includes('samsung')) return 'android-samsung';
      if (userAgent.includes('opera')) return 'android-opera';
      return 'android-other';
    }
    
    return 'desktop';
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Enhanced mobile installation handling with native triggers
      const userAgent = navigator.userAgent.toLowerCase();
      const browserType = getMobileBrowserTypeForHandling();
      
      // Try to trigger native installation flows where possible
      try {
        // For iOS Safari - attempt to programmatically trigger share sheet
        if (browserType === 'ios-safari' && navigator.share) {
          try {
            await navigator.share({
              title: 'TriPlace App',
              text: 'Install TriPlace on your home screen',
              url: window.location.href
            });
            setShowInstallDialog(false);
            return;
          } catch (shareError) {
            // Fall through to instructions if sharing fails
          }
        }
        
        // For Android Chrome - try to trigger installation prompt
        if (browserType === 'android-chrome') {
          // Create and dispatch beforeinstallprompt event to trigger browser prompt
          const installEvent = new CustomEvent('beforeinstallprompt', {
            bubbles: true,
            cancelable: true
          });
          
          // Try to trigger the browser's install prompt
          if ((window as any).chrome && (window as any).chrome.webstore) {
            window.dispatchEvent(installEvent);
          }
          
          // Show immediate instructions for manual installation
          setTimeout(() => {
            toast({
              title: "Install Available",
              description: "Look for 'Install' in your browser's address bar or tap the menu (⋮) and select 'Install app'",
              duration: 8000
            });
          }, 500);
          
          setShowInstallDialog(false);
          return;
        }
        
        // For other Android browsers with potential install capability
        if (browserType.startsWith('android') && (window as any).chrome) {
          const installEvent = new CustomEvent('beforeinstallprompt');
          window.dispatchEvent(installEvent);
        }
        
      } catch (error) {
        console.log('Native installation trigger failed:', error);
      }
      
      // Fallback to browser-specific instruction toasts
      switch (browserType) {
        case 'ios-safari':
          toast({
            title: "📱 Add TriPlace to Home Screen",
            description: "Tap Share (⬆️) at bottom → Scroll down → Tap 'Add to Home Screen' → Tap 'Add'",
            duration: 15000
          });
          break;
          
        case 'ios-chrome':
          toast({
            title: "📱 Add TriPlace to Home Screen", 
            description: "Tap menu (⋯) in corner → Tap 'Add to Home Screen' → Tap 'Add'",
            duration: 12000
          });
          break;
          
        case 'ios-firefox':
          toast({
            title: "📱 Add TriPlace to Home Screen",
            description: "Tap menu button → Tap 'Add to Home Screen' → Tap 'Add'",
            duration: 12000
          });
          break;
          
        case 'android-chrome':
          toast({
            title: "📱 Install TriPlace App",
            description: "Look for 'Install' in address bar or menu (⋮) → Tap 'Install app'",
            duration: 10000
          });
          break;
          
        case 'android-firefox':
          toast({
            title: "📱 Install TriPlace App",
            description: "Tap menu (⋮) → Tap 'Install' → Tap 'Add to Home Screen'",
            duration: 10000
          });
          break;
          
        case 'android-samsung':
          toast({
            title: "📱 Add to Home Screen",
            description: "Tap menu → Tap 'Add page to' → Tap 'Home screen'",
            duration: 10000
          });
          break;
          
        case 'android-opera':
          toast({
            title: "📱 Add to Home Screen", 
            description: "Tap menu → Tap 'Add to Home screen'",
            duration: 10000
          });
          break;
          
        default:
          toast({
            title: "📱 Add to Home Screen",
            description: "Use your browser's menu to add TriPlace to your home screen for quick access",
            duration: 8000
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
    const browserType = getMobileBrowserTypeForHandling();
    
    switch (browserType) {
      case 'ios-safari':
        return "1. Tap Share (⬆️) at bottom of Safari\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add' to confirm installation";
        
      case 'ios-chrome':
        return "1. Tap the menu (⋯) in top corner\n2. Tap 'Add to Home Screen'\n3. Tap 'Add' to confirm installation";
        
      case 'ios-firefox':
        return "1. Tap the menu button\n2. Tap 'Add to Home Screen'\n3. Tap 'Add' to confirm installation";
        
      case 'android-chrome':
        return "Look for 'Install' in address bar or:\n1. Tap menu (⋮)\n2. Tap 'Install app' or 'Add to Home screen'";
        
      case 'android-firefox':
        return "1. Tap the menu (⋮)\n2. Tap 'Install'\n3. Tap 'Add to Home Screen'";
        
      case 'android-samsung':
        return "1. Tap the menu\n2. Tap 'Add page to'\n3. Tap 'Home screen'";
        
      case 'android-opera':
        return "1. Tap the menu\n2. Tap 'Add to Home screen'";
        
      default:
        return "Use your browser's menu to add TriPlace to your home screen for quick access";
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
            <Button
              onClick={handleInstall}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {deferredPrompt ? 'Install TriPlace' : 'Add to Home Screen'}
            </Button>
            
            {!deferredPrompt && (
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Tap the button above to get step-by-step instructions
                </p>
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