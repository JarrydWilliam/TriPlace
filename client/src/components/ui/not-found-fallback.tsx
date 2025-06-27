import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Home, Search } from "lucide-react";
import { useLocation } from "wouter";

interface NotFoundFallbackProps {
  message?: string;
  suggestion?: string;
  showSearch?: boolean;
}

export function NotFoundFallback({ 
  message = "Page Not Found",
  suggestion = "The page you're looking for doesn't exist or has been moved.",
  showSearch = false 
}: NotFoundFallbackProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{message}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {suggestion}
          </p>
          
          <div className="flex flex-col gap-3">
            <Button onClick={() => setLocation('/dashboard')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            {showSearch && (
              <Button variant="outline" onClick={() => setLocation('/communities')} className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Browse Communities
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}