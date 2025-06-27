import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Bell, Smartphone, Mail, MessageSquare, Calendar, Users, Heart, Settings } from "lucide-react";
import { Link } from "wouter";

export default function NotificationSettings() {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    // Push Notifications
    pushEnabled: true,
    pushMessages: true,
    pushEvents: true,
    pushCommunity: true,
    pushKudos: true,
    pushMatches: true,
    
    // Email Notifications
    emailEnabled: true,
    emailWeekly: true,
    emailEvents: true,
    emailCommunity: false,
    emailMarketing: false,
    
    // In-App Notifications
    inAppMessages: true,
    inAppEvents: true,
    inAppCommunity: true,
    inAppKudos: true,
    
    // Quiet Hours
    quietHoursEnabled: true,
    quietStart: "22:00",
    quietEnd: "08:00"
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    toast({ title: "Notification preferences saved!" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Push Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Push Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Enable Push Notifications</p>
                  <p className="text-sm text-gray-500">Allow TriPlace to send notifications to your device</p>
                </div>
                <Switch
                  checked={settings.pushEnabled}
                  onCheckedChange={(checked) => updateSetting('pushEnabled', checked)}
                />
              </div>

              {settings.pushEnabled && (
                <div className="space-y-3 ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Messages</p>
                        <p className="text-sm text-gray-500">New direct messages and community posts</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushMessages}
                      onCheckedChange={(checked) => updateSetting('pushMessages', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium">Events</p>
                        <p className="text-sm text-gray-500">Event reminders and invitations</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushEvents}
                      onCheckedChange={(checked) => updateSetting('pushEvents', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-medium">Community Activity</p>
                        <p className="text-sm text-gray-500">New members and community updates</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushCommunity}
                      onCheckedChange={(checked) => updateSetting('pushCommunity', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="font-medium">Kudos & Appreciation</p>
                        <p className="text-sm text-gray-500">When someone gives you kudos</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushKudos}
                      onCheckedChange={(checked) => updateSetting('pushKudos', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="font-medium">New Matches</p>
                        <p className="text-sm text-gray-500">High-compatibility community recommendations</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushMatches}
                      onCheckedChange={(checked) => updateSetting('pushMatches', checked)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Email Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Enable Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive updates via email</p>
                </div>
                <Switch
                  checked={settings.emailEnabled}
                  onCheckedChange={(checked) => updateSetting('emailEnabled', checked)}
                />
              </div>

              {settings.emailEnabled && (
                <div className="space-y-3 ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Summary</p>
                      <p className="text-sm text-gray-500">Your weekly activity and recommendations</p>
                    </div>
                    <Switch
                      checked={settings.emailWeekly}
                      onCheckedChange={(checked) => updateSetting('emailWeekly', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Event Reminders</p>
                      <p className="text-sm text-gray-500">24-hour reminders for events you're attending</p>
                    </div>
                    <Switch
                      checked={settings.emailEvents}
                      onCheckedChange={(checked) => updateSetting('emailEvents', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Community Highlights</p>
                      <p className="text-sm text-gray-500">Weekly digest of community activity</p>
                    </div>
                    <Switch
                      checked={settings.emailCommunity}
                      onCheckedChange={(checked) => updateSetting('emailCommunity', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Tips & Features</p>
                      <p className="text-sm text-gray-500">Occasional emails about new features</p>
                    </div>
                    <Switch
                      checked={settings.emailMarketing}
                      onCheckedChange={(checked) => updateSetting('emailMarketing', checked)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* In-App Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>In-App Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Message Notifications</p>
                  <p className="text-sm text-gray-500">Show notification badges for new messages</p>
                </div>
                <Switch
                  checked={settings.inAppMessages}
                  onCheckedChange={(checked) => updateSetting('inAppMessages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Event Notifications</p>
                  <p className="text-sm text-gray-500">Show badges for upcoming events</p>
                </div>
                <Switch
                  checked={settings.inAppEvents}
                  onCheckedChange={(checked) => updateSetting('inAppEvents', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Community Activity</p>
                  <p className="text-sm text-gray-500">Show badges for community updates</p>
                </div>
                <Switch
                  checked={settings.inAppCommunity}
                  onCheckedChange={(checked) => updateSetting('inAppCommunity', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Kudos Notifications</p>
                  <p className="text-sm text-gray-500">Show when you receive kudos</p>
                </div>
                <Switch
                  checked={settings.inAppKudos}
                  onCheckedChange={(checked) => updateSetting('inAppKudos', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Quiet Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Enable Quiet Hours</p>
                  <p className="text-sm text-gray-500">Pause notifications during specified times</p>
                </div>
                <Switch
                  checked={settings.quietHoursEnabled}
                  onCheckedChange={(checked) => updateSetting('quietHoursEnabled', checked)}
                />
              </div>

              {settings.quietHoursEnabled && (
                <div className="grid grid-cols-2 gap-4 ml-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <input
                      type="time"
                      value={settings.quietStart}
                      onChange={(e) => setSettings(prev => ({ ...prev, quietStart: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <input
                      type="time"
                      value={settings.quietEnd}
                      onChange={(e) => setSettings(prev => ({ ...prev, quietEnd: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Frequency */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                  <p className="font-medium text-blue-600">Real-time</p>
                  <p className="text-sm text-gray-500 mt-1">Get notified immediately</p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Current</Badge>
                </div>
                
                <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <p className="font-medium">Bundled</p>
                  <p className="text-sm text-gray-500 mt-1">Group notifications every hour</p>
                </div>
                
                <div className="p-4 border rounded-lg text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-sm text-gray-500 mt-1">One summary per day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-3">
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave}>Save Preferences</Button>
          </div>
        </div>
      </div>
    </div>
  );
}