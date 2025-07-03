import { useEffect, useState } from 'react';
import { Button } from './button';
import { RefreshCw } from 'lucide-react';

const APP_VERSION = '1.0.4'; // Increment this to trigger updates

export function PwaUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check version on app load
    checkAppVersion();
    
    // Check for updates every 60 seconds
    const interval = setInterval(checkAppVersion, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const checkAppVersion = () => {
    try {
      const lastVersion = localStorage.getItem('triplace_app_version');
      
      if (lastVersion && lastVersion !== APP_VERSION) {
        setUpdateAvailable(true);
      } else if (!lastVersion) {
        // First time user, set version
        localStorage.setItem('triplace_app_version', APP_VERSION);
      }
    } catch (error) {
      console.log('Version check failed:', error);
    }
  };

  const handleUpdate = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      // Update stored version first
      localStorage.setItem('triplace_app_version', APP_VERSION);
      
      // Clear all caches safely
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(async (name) => {
              try {
                await caches.delete(name);
              } catch (err) {
                // Ignore individual cache deletion errors
              }
            })
          );
        } catch (err) {
          // Ignore cache clearing errors
        }
      }
      
      // Unregister service workers safely
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(async (reg) => {
              try {
                await reg.unregister();
              } catch (err) {
                // Ignore individual unregister errors
              }
            })
          );
        } catch (err) {
          // Ignore service worker errors
        }
      }
      
      // Small delay to ensure operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use standard reload method (no deprecated parameter)
      window.location.reload();
    } catch (error) {
      // Fallback: simple reload without cache clearing
      try {
        localStorage.setItem('triplace_app_version', APP_VERSION);
        window.location.reload();
      } catch (fallbackError) {
        // Last resort: navigate to current URL
        window.location.href = window.location.href;
      }
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
      <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
      <span className="text-sm font-medium">
        {isUpdating ? 'Updating app...' : 'App update available'}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleUpdate}
        disabled={isUpdating}
        className="bg-white text-orange-500 hover:bg-gray-100 disabled:opacity-50"
      >
        {isUpdating ? 'Updating...' : 'Update Now'}
      </Button>
    </div>
  );
}