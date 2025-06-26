import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DomainHelper() {
  const { toast } = useToast();
  const currentDomain = window.location.origin;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Domain copied successfully",
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Firebase Setup Helper
          <ExternalLink className="h-4 w-4" />
        </CardTitle>
        <CardDescription>
          Add this domain to Firebase Console to enable Google sign-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Current Domain:</p>
          <div className="flex items-center gap-2">
            <code className="bg-background px-2 py-1 rounded text-sm flex-1">
              {currentDomain}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(currentDomain)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="font-medium">Steps to fix Google sign-in:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebase Console</a></li>
            <li>Select your TriPlace project</li>
            <li>Go to Authentication → Settings → Authorized domains</li>
            <li>Click "Add domain" and paste the domain above</li>
            <li>Save and try Google sign-in again</li>
          </ol>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Also verify that Google sign-in method is enabled in Authentication → Sign-in method
          </p>
        </div>
      </CardContent>
    </Card>
  );
}