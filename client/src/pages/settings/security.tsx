import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Shield, Smartphone, Lock, LogOut, AlertTriangle, Eye, EyeOff, CheckCircle, QrCode } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SecuritySettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const activeSessions = [
    {
      id: 1,
      device: "Current Device",
      browser: "Chrome on macOS",
      location: "Salt Lake City, UT",
      lastActive: "Active now",
      current: true
    },
    {
      id: 2,
      device: "iPhone",
      browser: "Safari Mobile",
      location: "Salt Lake City, UT",
      lastActive: "2 hours ago",
      current: false
    },
    {
      id: 3,
      device: "Work Computer",
      browser: "Firefox on Windows",
      location: "Salt Lake City, UT",
      lastActive: "Yesterday",
      current: false
    }
  ];

  const recoveryCodes = [
    "a1b2-c3d4-e5f6", "g7h8-i9j0-k1l2", "m3n4-o5p6-q7r8",
    "s9t0-u1v2-w3x4", "y5z6-a7b8-c9d0", "e1f2-g3h4-i5j6",
    "k7l8-m9n0-o1p2", "q3r4-s5t6-u7v8"
  ];

  const enableTwoFactor = () => {
    setShowQRDialog(true);
  };

  const completeTwoFactorSetup = () => {
    if (verificationCode.length === 6) {
      setTwoFactorEnabled(true);
      setShowQRDialog(false);
      setShowRecoveryCodes(true);
      toast({ title: "Two-factor authentication enabled!" });
    }
  };

  const disableTwoFactor = () => {
    setTwoFactorEnabled(false);
    toast({ title: "Two-factor authentication disabled" });
  };

  const signOutDevice = (sessionId: number) => {
    toast({ title: "Device signed out successfully" });
  };

  const signOutAllDevices = () => {
    toast({ title: "All other devices signed out" });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Two-Factor Authentication</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${twoFactorEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {twoFactorEnabled ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Shield className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">2FA Status</p>
                    <p className="text-sm text-gray-500">
                      {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                    </p>
                  </div>
                </div>
                <Badge variant={twoFactorEnabled ? "default" : "secondary"}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              {!twoFactorEnabled ? (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <Shield className="w-4 h-4 inline mr-1" />
                      Add an extra layer of security to your account with two-factor authentication.
                    </p>
                  </div>
                  <Button onClick={enableTwoFactor} className="w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Enable Two-Factor Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Your account is protected with two-factor authentication.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => setShowRecoveryCodes(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Recovery Codes
                    </Button>
                    <Button variant="outline" onClick={disableTwoFactor}>
                      <Shield className="mr-2 h-4 w-4" />
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Active Sessions</span>
                <Badge variant="secondary">{activeSessions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && (
                            <Badge variant="outline" className="text-green-600 bg-green-50">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{session.browser}</p>
                        <p className="text-sm text-gray-500">{session.location} • {session.lastActive}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => signOutDevice(session.id)}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={signOutAllDevices} className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out All Other Sessions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Password & Login */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="w-5 h-5" />
                <span>Password & Login</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Login Activity</p>
                    <p className="text-sm text-gray-500">Review recent login attempts</p>
                  </div>
                  <Button variant="outline">View Activity</Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Login Notifications</p>
                    <p className="text-sm text-gray-500">Get alerts for new sign-ins</p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Alerts */}
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
                <span>Security Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <div className="text-left">
                    <p className="font-medium">Report Security Issue</p>
                    <p className="text-sm text-gray-500">Report suspicious activity or security concerns</p>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start">
                  <div className="text-left">
                    <p className="font-medium">Account Recovery</p>
                    <p className="text-sm text-gray-500">Learn how to recover your account if locked out</p>
                  </div>
                </Button>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  If you notice anything suspicious, please report it immediately to keep your account secure.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2FA Setup Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app, then enter the verification code.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-gray-400" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verification">Verification Code</Label>
                <Input
                  id="verification"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQRDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={completeTwoFactorSetup}
                disabled={verificationCode.length !== 6}
              >
                Enable 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recovery Codes Dialog */}
        <Dialog open={showRecoveryCodes} onOpenChange={setShowRecoveryCodes}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Recovery Codes</DialogTitle>
              <DialogDescription>
                Save these codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm">
                {recoveryCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white dark:bg-gray-900 rounded border">
                    {code}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Each code can only be used once. Store them securely and don't share them.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowRecoveryCodes(false)}>
                I've Saved These Codes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}