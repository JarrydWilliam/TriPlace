import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Shield, Smartphone, Trash2, AlertTriangle, ExternalLink, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AccountSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleDeleteAccount = () => {
    if (deleteConfirmation === 'DELETE') {
      toast({ title: "Account deletion initiated", description: "You will receive an email with further instructions." });
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
                  <Button variant="link" className="p-0 h-auto">
                    Upgrade to Premium
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
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
              {/* Google Account */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">G</span>
                  </div>
                  <div>
                    <p className="font-medium">Google</p>
                    <p className="text-sm text-gray-500">Connected • {user?.email}</p>
                    <div className="flex items-center space-x-1 mt-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">Primary account</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDisconnectGoogle}>
                  Disconnect
                </Button>
              </div>

              {/* Apple Account */}
              <div className="flex items-center justify-between p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">🍎</span>
                  </div>
                  <div>
                    <p className="font-medium">Apple</p>
                    <p className="text-sm text-gray-500">Not connected</p>
                    <p className="text-xs text-gray-400">Enable Sign in with Apple for easier access</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleConnectApple}>
                  Connect
                </Button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Connected accounts help you sign in securely and recover your account if needed.
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
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Download Your Data</p>
                    <p className="text-sm text-gray-500">Get a copy of your TriPlace data</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <p className="font-medium">Privacy Settings</p>
                    <p className="text-sm text-gray-500">Manage how your data is used</p>
                  </div>
                </Button>
              </div>

              <div className="space-y-2">
                <Button variant="link" className="p-0 h-auto justify-start">
                  Privacy Policy
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
                <Button variant="link" className="p-0 h-auto justify-start">
                  Terms of Service
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
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
                <Button variant="outline" className="w-full justify-start">
                  <div className="text-left">
                    <p className="font-medium">Deactivate Account</p>
                    <p className="text-sm text-gray-500">Temporarily disable your account</p>
                  </div>
                </Button>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <div className="text-left">
                        <p className="font-medium">Delete Account</p>
                        <p className="text-sm">Permanently delete your account and all data</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600">Delete Account</DialogTitle>
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
                        disabled={deleteConfirmation !== 'DELETE'}
                      >
                        Delete Account
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