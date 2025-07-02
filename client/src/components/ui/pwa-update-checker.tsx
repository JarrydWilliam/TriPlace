import { useEffect, useState } from 'react';
import { Button } from './button';
import { RefreshCw } from 'lucide-react';

const APP_VERSION = '1.0.2'; // Increment this to trigger updates

export function PwaUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

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
    try {
      // Update stored version
      localStorage.setItem('triplace_app_version', APP_VERSION);
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Unregister service worker to ensure fresh install
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      // Force hard reload
      window.location.reload();
    } catch (error) {
      console.log('Update failed:', error);
      // Fallback: just reload
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-3">
      <RefreshCw className="w-4 h-4" />
      <span className="text-sm font-medium">App update available</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleUpdate}
        className="bg-white text-orange-500 hover:bg-gray-100"
      >
        Update Now
      </Button>
    </div>
  );
}