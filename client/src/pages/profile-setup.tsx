import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function ProfileSetup() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Handle avatar file upload and preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatar(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile info
  const saveProfile = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = avatar;
      // If a new avatar file is selected, upload it
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const uploadRes = await fetch(`/api/users/${user?.id}/avatar`, {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          avatarUrl = data.avatarUrl;
        }
      }
      // Update user profile
      await apiRequest("PATCH", `/api/users/${user?.id}`, {
        name: name.trim(),
        avatar: avatarUrl,
        profileCompleted: true,
      });
      toast({ title: "Profile saved!", description: "Let's finish onboarding." });
      navigate("/onboarding");
    } catch (error) {
      toast({ title: "Error", description: "Failed to save profile. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Set Up Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            <div className="flex flex-col items-center space-y-2">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback className="bg-primary text-white text-3xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <label className="block mt-2">
                <span className="text-sm text-gray-300">Profile Picture (optional)</span>
                <Input type="file" accept="image/*" onChange={handleAvatarChange} className="mt-1" />
              </label>
            </div>
            <div className="w-full">
              <Label htmlFor="name" className="text-gray-300">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="bg-gray-700 border-gray-600 text-white mt-1"
                required
              />
            </div>
            <Button
              className="w-full bg-primary py-3 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg mt-4"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : "Save & Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 