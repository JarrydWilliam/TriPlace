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

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'desktop' | 'mobile' | 'ios' | 'android' | 'unknown'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    // Detect platform
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isMobile = /mobile|android|iphone|ipad|tablet/.test(userAgent);
      
      if (isIOS) {
        setPlatform('ios');
      } else if (isAndroid) {
        setPlatform('android');
      } else if (isMobile) {
        setPlatform('mobile');
      } else {
        setPlatform('desktop');
      }
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install dialog after a short delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallDialog(true);
        }
      }, 2000);
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

    checkInstalled();
    detectPlatform();
    
    // Auto-show installation prompt for iOS and Android after delay
    const autoShowPrompt = () => {
      setTimeout(() => {
        if (!isInstalled && (platform === 'ios' || platform === 'android' || platform === 'mobile')) {
          setShowInstallDialog(true);
        }
      }, 3000);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Show prompt for iOS/Android devices even without beforeinstallprompt
    autoShowPrompt();

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

  if (isInstalled) {
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
              onClick={() => setShowInstallDialog(false)}
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
          
          <div className="space-y-3">
            {platform === 'ios' ? (
              <div className="text-center space-y-4">
                <div className="text-4xl">📱</div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Add to iPhone Home Screen</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
                    <ol className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start space-x-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                        <span>Tap the <strong>Share</strong> button (📤) at the bottom of Safari</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                        <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                        <span>Tap <strong>"Add"</strong> to install TriPlace</span>
                      </li>
                    </ol>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowInstallDialog(false)}
                  className="w-full"
                  size="lg"
                >
                  Got it, thanks!
                </Button>
              </div>
            ) : platform === 'android' ? (
              <div className="text-center space-y-4">
                <div className="text-4xl">🤖</div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Install on Android</h3>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-left">
                    <ol className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                      <li className="flex items-start space-x-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                        <span>Tap the <strong>menu</strong> button (⋮) in your browser</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                        <span>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                        <span>Tap <strong>"Install"</strong> to add TriPlace to your home screen</span>
                      </li>
                    </ol>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {deferredPrompt && (
                    <Button onClick={handleInstall} className="flex-1" size="lg">
                      <Download className="w-4 h-4 mr-2" />
                      Install Now
                    </Button>
                  )}
                  <Button 
                    variant={deferredPrompt ? "outline" : "default"}
                    onClick={() => setShowInstallDialog(false)}
                    className="flex-1"
                    size="lg"
                  >
                    Got it!
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
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
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getInstallInstructions()}
                    </p>
                    <Button
                      onClick={() => setShowInstallDialog(false)}
                      variant="outline"
                      className="w-full"
                    >
                      Got it!
                    </Button>
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  onClick={() => setShowInstallDialog(false)}
                  className="w-full text-sm"
                >
                  Maybe later
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}