import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Shield, Smartphone, Trash2, AlertTriangle, ExternalLink, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signOutUser, deleteFirebaseAccount } from "@/lib/firebase";

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE' || !user?.id) return;
    setIsDeleting(true);
    try {
      await apiRequest('DELETE', `/api/users/${user.id}`);
      // Also delete from Firebase Auth to meet strict App Store requirements
      try {
        await deleteFirebaseAccount();
      } catch (fbErr: any) {
        console.warn("Firebase deletion failed:", fbErr);
        // If it's a re-auth error, we might still want to log them out
        // but we've already deleted their DB record, so they are effectively gone from SameVibe
      }
      await signOut();
      toast({ title: "Account deleted", description: "Your account and all data have been permanently deleted." });
      navigate('/');
    } catch (err) {
      toast({ title: "Deletion failed", description: err instanceof Error ? err.message : "Please try again or contact privacy@samevibe.app", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };


  const handleDisconnectGoogle = () => {
    toast({ title: "Google account disconnected", description: "You'll need to sign in again next time." });
  };

  const handleConnectApple = () => {
    toast({ title: "Apple Sign-In", description: "Redirecting to Apple authentication..." });
  };

  return (
    <div className="mobile-page-container bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <Card>
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
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <Badge variant="secondary" className="text-green-600 bg-green-100">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Email is managed through your connected Google account
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input
                    value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-blue-600 bg-blue-50">
                    Free Account
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Connected Accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sign-in providers */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Your sign-in method is managed by Google or Apple. To change authentication
                  providers, sign out and sign back in using the desired method.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
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
                      <p className="text-sm text-gray-500">Email privacy@samevibe.app to request a copy</p>
                    </div>
                  </Button>
                </a>

                <Link href="/privacy">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <div className="text-left">
                      <p className="font-medium">Privacy Policy</p>
                      <p className="text-sm text-gray-500">View how your data is used</p>
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
          <Card className="border-red-200 dark:border-red-800">
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
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
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

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
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