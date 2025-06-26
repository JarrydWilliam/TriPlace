import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Smartphone, Monitor, Download, Share, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PWAInstallInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallInstructions({ isOpen, onClose }: PWAInstallInstructionsProps) {
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [browserType, setBrowserType] = useState<'chrome' | 'firefox' | 'safari' | 'edge' | 'other'>('chrome');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
      setBrowserType('safari');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
      setBrowserType('chrome');
    } else {
      setDeviceType('desktop');
      if (userAgent.includes('firefox')) setBrowserType('firefox');
      else if (userAgent.includes('edge')) setBrowserType('edge');
      else if (userAgent.includes('safari') && !userAgent.includes('chrome')) setBrowserType('safari');
      else setBrowserType('chrome');
    }
  }, []);

  const getInstructions = () => {
    if (deviceType === 'ios') {
      return {
        title: "Add TriPlace to Home Screen",
        icon: <Smartphone className="h-6 w-6" />,
        steps: [
          { icon: <Share className="h-4 w-4" />, text: "Tap the Share button at the bottom of Safari" },
          { icon: <Plus className="h-4 w-4" />, text: "Scroll down and tap 'Add to Home Screen'" },
          { icon: <Download className="h-4 w-4" />, text: "Tap 'Add' to confirm and install TriPlace" }
        ]
      };
    } else if (deviceType === 'android') {
      return {
        title: "Install TriPlace App",
        icon: <Smartphone className="h-6 w-6" />,
        steps: [
          { icon: <Download className="h-4 w-4" />, text: "Tap the menu (three dots) in Chrome" },
          { icon: <Plus className="h-4 w-4" />, text: "Select 'Add to Home screen' or 'Install app'" },
          { icon: <Download className="h-4 w-4" />, text: "Tap 'Install' to add TriPlace to your phone" }
        ]
      };
    } else {
      return {
        title: "Install TriPlace Desktop App",
        icon: <Monitor className="h-6 w-6" />,
        steps: [
          { icon: <Download className="h-4 w-4" />, text: "Look for the install icon in your browser's address bar" },
          { icon: <Plus className="h-4 w-4" />, text: "Click 'Install' when the popup appears" },
          { icon: <Download className="h-4 w-4" />, text: "TriPlace will be added to your desktop and apps menu" }
        ]
      };
    }
  };

  const instructions = getInstructions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {instructions.icon}
            {instructions.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Install TriPlace as an app for the best experience - faster loading, offline access, and native notifications.
          </p>
          
          <div className="space-y-3">
            {instructions.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-medium text-primary">{index + 1}</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  {step.icon}
                  <p className="text-sm">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          
          {deviceType === 'ios' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Note: Make sure you're using Safari to see the Share button. Other browsers on iOS don't support app installation.
              </p>
            </div>
          )}
          
          {deviceType === 'android' && browserType !== 'chrome' && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-700 dark:text-orange-300">
                For the best installation experience, we recommend using Chrome browser on Android devices.
              </p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button onClick={onClose} className="flex-1">
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}