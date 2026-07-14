import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, ArrowLeft, Mail, ExternalLink, Shield, Smartphone, Trash2 } from "lucide-react";
import { useSafeNavigate } from "@/hooks/use-safe-navigate";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signOutUser, deleteFirebaseAccount } from "@/lib/firebase";

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigateAfterClose = useSafeNavigate();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE' || !user?.id) return;
    setIsDeleting(true);
    try {
      await apiRequest('DELETE', `/api/users/${user.id}`);
      try {
        await deleteFirebaseAccount();
      } catch (fbErr: any) {
        console.warn("Firebase deletion failed:", fbErr);
      }
      await signOut();
      toast({ title: "Account deleted", description: "Your account and all data have been permanently deleted." });
      navigateAfterClose(() => setShowDeleteDialog(false), '/');
    } catch (err) {
      toast({ title: "Deletion failed", description: err instanceof Error ? err.message : "Please try again or contact privacy@samevibe.app", variant: "destructive" });
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };


  const handleDisconnectGoogle = () => {
    toast({ title: "Google account disconnected", description: "You'll need to sign in again next time." });
  };

  const handleConnectApple = () => {
    toast({ title: "Apple Sign-In", description: "Redirecting to Apple authentication..." });
  };

  return (
    <div className="mobile-page-container bg-background relative overflow-hidden">
      {/* Rich ambient bokeh */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Account Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-muted/30 border-white/10 text-foreground"
                    />
                    <Badge variant="secondary" className="text-green-600 bg-green-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground/80">
                    Email is managed through your connected Google account
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    disabled
                    className="bg-muted/30 border-white/10 text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20">
                    Free Account
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Connected Accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sign-in providers */}
              <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                <p className="text-sm text-accent-foreground/90">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Your sign-in method is managed by Google or Apple. To change authentication
                  providers, sign out and sign back in using the desired method.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Data & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a href="mailto:privacy@samevibe.app?subject=Data%20Download%20Request">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="text-left">
                      <p className="font-medium">Download Your Data</p>
                      <p className="text-sm text-muted-foreground/80">Email privacy@samevibe.app to request a copy</p>
                    </div>
                  </Button>
                </a>

                <Link href="/privacy">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="text-left">
                      <p className="font-medium">Privacy Policy</p>
                      <p className="text-sm text-muted-foreground/80">View how your data is used</p>
                    </div>
                  </Button>
                </Link>
              </div>

              <div className="space-y-2">
                <Link href="/privacy">
                  <Button variant="link" className="p-0 h-auto justify-start">
                    Privacy Policy
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Link href="/terms">
                  <Button variant="link" className="p-0 h-auto justify-start">
                    Terms of Service
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Link href="/delete-account">
                  <Button variant="link" className="p-0 h-auto justify-start text-muted-foreground">
                    Account Deletion Info
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-red-500/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span>Account Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Delete SameVibe Account</p>
                        <p className="text-sm">Permanently delete your account and all data</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600">Delete SameVibe Account</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. All your data, communities, messages, and connections will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="confirm">Type "DELETE" to confirm</Label>
                        <Input
                          id="confirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="DELETE"
                        />
                      </div>
                      <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <p className="text-sm text-red-500">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          This will immediately delete your account and cannot be reversed.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete SameVibe Account"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-yellow-500/90">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Account actions are permanent and cannot be undone. Please contact support if you need help.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}