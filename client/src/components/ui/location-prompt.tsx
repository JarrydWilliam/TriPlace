import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Wifi } from 'lucide-react';

interface LocationPromptProps {
  onAllow: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function LocationPrompt({ onAllow, onSkip, isLoading }: LocationPromptProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle>Enable Location Services</CardTitle>
        <CardDescription>
          Get personalized community recommendations based on your location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <Navigation className="w-4 h-4 text-green-500" />
            <span>Find communities and events near you</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <Wifi className="w-4 h-4 text-blue-500" />
            <span>Smart fallback if GPS isn't available</span>
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={onAllow} 
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? 'Getting Location...' : 'Allow Location'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onSkip}
            disabled={isLoading}
          >
            Skip
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          We use location to show relevant communities. Your privacy is protected.
        </p>
      </CardContent>
    </Card>
  );
}