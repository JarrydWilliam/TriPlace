import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Plus, X, MapPin, Calendar, Link as LinkIcon, Save } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useRef } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { VibePageHeader } from "@/components/layout/vibe-page-header";

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: '',
    birthday: '',
    phone: ''
  });
  
  const [privacySettings, setPrivacySettings] = useState({
    showProfileInDiscovery: true,
    showLocation: true,
    showActivityStatus: true,
    allowDirectMessages: true,
    showJoinedEvents: true,
  });
  
  const [interests, setInterests] = useState(user?.interests || []);
  const [newInterest, setNewInterest] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      try {
        await apiRequest('PATCH', `/api/users/${user.id}`, { avatar: base64String });
        toast({ title: "Photo updated" });
      } catch (error) {
        toast({ title: "Failed to update photo", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await apiRequest('PATCH', `/api/users/${user.id}`, {
        name: profileData.name,
        bio: profileData.bio,
        location: profileData.location,
        interests: interests,
      });
      toast({ title: "Profile updated successfully!" });
    } catch (error) {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground safe-area-bottom pb-nav relative overflow-hidden">
      <VibePageHeader mode="detail" title="Edit Profile" />
      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Photo Section */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Avatar className="w-32 h-32 mx-auto">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback className="text-2xl">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-3">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <div className="flex gap-2 justify-center">
                  <Button
                    className="rounded-full px-5 text-sm font-semibold bg-white/10 border border-white/20 text-foreground hover:bg-white/20"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full px-5 text-sm font-semibold border-white/20 text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                JPG, PNG or GIF. Max size 10MB.
              </p>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      placeholder="Your display name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                        placeholder="City, State"
                        className="pl-10 bg-background/50 border-white/10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    placeholder="Tell others about yourself..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {profileData.bio.length}/160 characters
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="website"
                        value={profileData.website}
                        onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                        placeholder="https://yourwebsite.com"
                        className="pl-10 bg-background/50 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="birthday"
                        type="date"
                        value={profileData.birthday}
                        onChange={(e) => setProfileData({...profileData, birthday: e.target.value})}
                        className="pl-10 bg-background/50 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
              <CardHeader>
                <CardTitle>Interests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => removeInterest(interest)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:bg-primary/85 transition-colors"
                    >
                      {interest}
                      <X className="h-3 w-3 opacity-75" />
                    </button>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add an interest..."
                    onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                  />
                  <Button onClick={addInterest} disabled={!newInterest.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {['Technology', 'Music', 'Sports', 'Travel', 'Food', 'Art', 'Reading', 'Gaming'].map((suggestion) => (
                    !interests.includes(suggestion) && (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => setInterests([...interests, suggestion])}
                      >
                        + {suggestion}
                      </Button>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings Container with Full Interactive Toggles */}
            <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/10 shadow-xl rounded-3xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center justify-between">
                  <span>Privacy Controls</span>
                  <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                    Live Security
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-4 divide-y divide-white/5">
                  {/* Toggle 1: Show Profile in Discovery */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="pr-4">
                      <p className="font-semibold text-sm text-white">Show Profile in Community Discovery</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Allow members to find your profile in local interest groups</p>
                    </div>
                    <Switch 
                      checked={privacySettings.showProfileInDiscovery}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showProfileInDiscovery: checked }))}
                    />
                  </div>
                  
                  {/* Toggle 2: Show Location */}
                  <div className="flex items-center justify-between pt-3">
                    <div className="pr-4">
                      <p className="font-semibold text-sm text-white">Show Approximate Location</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Display your city name to group members</p>
                    </div>
                    <Switch 
                      checked={privacySettings.showLocation}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showLocation: checked }))}
                    />
                  </div>
                  
                  {/* Toggle 3: Show Activity Status */}
                  <div className="flex items-center justify-between pt-3">
                    <div className="pr-4">
                      <p className="font-semibold text-sm text-white">Show Live Online Activity Status</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Let community members see when you're active</p>
                    </div>
                    <Switch 
                      checked={privacySettings.showActivityStatus}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showActivityStatus: checked }))}
                    />
                  </div>

                  {/* Toggle 4: Allow Direct Messages */}
                  <div className="flex items-center justify-between pt-3">
                    <div className="pr-4">
                      <p className="font-semibold text-sm text-white">Allow Direct Messaging</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Permit group members from shared events to message you</p>
                    </div>
                    <Switch 
                      checked={privacySettings.allowDirectMessages}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, allowDirectMessages: checked }))}
                    />
                  </div>

                  {/* Toggle 5: Show Joined Events */}
                  <div className="flex items-center justify-between pt-3">
                    <div className="pr-4">
                      <p className="font-semibold text-sm text-white">Show Joined Events on Profile</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Display upcoming events on your public profile card</p>
                    </div>
                    <Switch 
                      checked={privacySettings.showJoinedEvents}
                      onCheckedChange={(checked) => setPrivacySettings(prev => ({ ...prev, showJoinedEvents: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button Container with Proper Bottom Spacing Above Navigation Bar */}
            <div className="pt-4 pb-20">
              <Button
                onClick={handleSave}
                className="w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold rounded-2xl min-h-[54px] text-base shadow-2xl shadow-cyan-500/30 border border-cyan-300/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5 text-slate-950 font-bold" />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}