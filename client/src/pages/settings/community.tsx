import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Target, Edit, MapPin, Eye, Heart, MessageSquare, Calendar, Settings } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CommunitySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [discoverySettings, setDiscoverySettings] = useState({
    showInDiscovery: true,
    allowInvitations: true,
    shareLocation: true,
    shareActivity: true,
    maxDistance: [50],
    minMatchPercentage: [70]
  });

  const [communities] = useState([
    { id: 1, name: "Mindful Yoga Community", role: "Member", joinDate: "Dec 2024", category: "Wellness", memberCount: 234 },
    { id: 2, name: "Tech Entrepreneurs", role: "Moderator", joinDate: "Nov 2024", category: "Professional", memberCount: 567 },
    { id: 3, name: "Local Hikers", role: "Member", joinDate: "Jan 2025", category: "Outdoor", memberCount: 89 }
  ]);

  const handleRetakeQuiz = () => {
    toast({ title: "Redirecting to matching quiz..." });
    // Navigate to quiz
  };

  const handleLeaveCommunity = (communityId: number, communityName: string) => {
    toast({ title: `Left ${communityName}`, description: "You can rejoin anytime from the discover page." });
  };

  const handleSaveSettings = () => {
    toast({ title: "Community preferences saved!" });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Community Preferences</h1>
        </div>

        <div className="space-y-6">
          {/* My Communities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>My Communities</span>
                <Badge variant="secondary">{communities.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {communities.map((community) => (
                  <div key={community.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {community.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{community.name}</h3>
                          {community.role === "Moderator" && (
                            <Badge variant="outline" className="text-blue-600 bg-blue-50">
                              Moderator
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Joined {community.joinDate}</span>
                          <span>•</span>
                          <span>{community.memberCount} members</span>
                          <span>•</span>
                          <span>{community.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600">
                            Leave
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Leave {community.name}?</DialogTitle>
                            <DialogDescription>
                              You'll no longer receive updates from this community and won't be able to participate in discussions or events.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button 
                              variant="destructive"
                              onClick={() => handleLeaveCommunity(community.id, community.name)}
                            >
                              Leave Community
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Discover More Communities
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Matching Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Matching Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">Maximum Distance</p>
                    <Badge variant="outline">{discoverySettings.maxDistance[0]} miles</Badge>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={discoverySettings.maxDistance[0]}
                    onChange={(e) => setDiscoverySettings({...discoverySettings, maxDistance: [parseInt(e.target.value)]})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>10 miles</span>
                    <span>200 miles</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">Minimum Match Percentage</p>
                    <Badge variant="outline">{discoverySettings.minMatchPercentage[0]}%</Badge>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={discoverySettings.minMatchPercentage[0]}
                    onChange={(e) => setDiscoverySettings({...discoverySettings, minMatchPercentage: [parseInt(e.target.value)]})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>50%</span>
                    <span>95%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4" onClick={handleRetakeQuiz}>
                  <Target className="mr-3 h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Retake Matching Quiz</p>
                    <p className="text-sm text-gray-500">Update your preferences and interests</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Edit className="mr-3 h-5 w-5 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">Edit Quiz Answers</p>
                    <p className="text-sm text-gray-500">Modify specific responses</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Discovery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Discovery & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Show me in member discovery</p>
                      <p className="text-sm text-gray-500">Allow other users to find your profile</p>
                    </div>
                  </div>
                  <Switch
                    checked={discoverySettings.showInDiscovery}
                    onCheckedChange={(checked) => setDiscoverySettings({...discoverySettings, showInDiscovery: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Heart className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="font-medium">Allow community invitations</p>
                      <p className="text-sm text-gray-500">Let moderators invite you to relevant communities</p>
                    </div>
                  </div>
                  <Switch
                    checked={discoverySettings.allowInvitations}
                    onCheckedChange={(checked) => setDiscoverySettings({...discoverySettings, allowInvitations: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="font-medium">Share approximate location</p>
                      <p className="text-sm text-gray-500">Show your city to help find local communities</p>
                    </div>
                  </div>
                  <Switch
                    checked={discoverySettings.shareLocation}
                    onCheckedChange={(checked) => setDiscoverySettings({...discoverySettings, shareLocation: checked})}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="font-medium">Show activity status</p>
                      <p className="text-sm text-gray-500">Let others see when you're active</p>
                    </div>
                  </div>
                  <Switch
                    checked={discoverySettings.shareActivity}
                    onCheckedChange={(checked) => setDiscoverySettings({...discoverySettings, shareActivity: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interest Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Interest Categories</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: "Technology", active: true, color: "bg-blue-500" },
                  { name: "Wellness", active: true, color: "bg-green-500" },
                  { name: "Professional", active: true, color: "bg-purple-500" },
                  { name: "Creative", active: false, color: "bg-pink-500" },
                  { name: "Outdoor", active: true, color: "bg-emerald-500" },
                  { name: "Food & Drink", active: false, color: "bg-orange-500" },
                  { name: "Sports", active: false, color: "bg-red-500" },
                  { name: "Learning", active: true, color: "bg-indigo-500" }
                ].map((category) => (
                  <div
                    key={category.name}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      category.active 
                        ? `${category.color} text-white border-transparent` 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <p className="font-medium text-sm">{category.name}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Select the categories you're interested in to get better community recommendations.
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-3">
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSaveSettings}>Save Preferences</Button>
          </div>
        </div>
      </div>
    </div>
  );
}