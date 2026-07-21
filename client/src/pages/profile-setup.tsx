import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';
import { ComponentLoadingSpinner } from '@/components/loading-spinner';

export default function ProfileSetup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}`, profileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id] });
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated!'
      });
      setLocation('/onboarding');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    }
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name to continue.',
        variant: 'destructive'
      });
      return;
    }

    // For now, we'll just update the name and bio
    // Avatar upload would need additional backend setup
    updateProfileMutation.mutate({
      name: formData.name.trim(),
      bio: formData.bio.trim(),
    });
  };

  const handleSkip = () => {
    setLocation('/onboarding');
  };

  if (updateProfileMutation.isPending) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <ComponentLoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom relative overflow-hidden">
      {/* Rich ambient bokeh */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 space-y-3">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground shadow-sm">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground">
            Help others recognize you in communities
          </p>
        </div>

        <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-2xl rounded-3xl">
          <CardHeader>
            <CardTitle className="text-center text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              


              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="samevibe-premium-input px-4 min-h-[46px] bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
                  required
                />
              </div>

              {/* Bio Input */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium text-foreground">
                  Bio (Optional)
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell others a bit about yourself..."
                  className="samevibe-premium-input px-4 py-3 min-h-[80px] resize-none bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
                  maxLength={150}
                />
                <p className="text-xs text-muted-foreground/80 text-right">
                  {formData.bio.length}/150 characters
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full min-h-[44px] bg-primary hover:bg-primary/90 text-white shadow-lg transition-all hover:scale-[1.02]"
                  disabled={!formData.name.trim()}
                >
                  Continue to Quiz
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={handleSkip}
                  className="w-full min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-white/5"
                >
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}