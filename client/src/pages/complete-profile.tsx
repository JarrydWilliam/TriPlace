import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocation, Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ComponentLoadingSpinner } from '@/components/loading-spinner';
import { CURRENT_TERMS_VERSION } from '@shared/schema';

export default function CompleteProfile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');

  const updateComplianceMutation = useMutation({
    mutationFn: async (data: { dateOfBirth: string; termsVersion: string }) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/users', user?.id], updatedUser);
      toast({
        title: 'Success',
        description: 'Profile requirements completed!'
      });
      setLocation('/dashboard');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!dateOfBirth) {
      setError('Please enter your date of birth.');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms of Service to continue.');
      return;
    }

    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dobRegex.test(dateOfBirth)) {
      setError("Invalid date format. Use YYYY-MM-DD.");
      return;
    }

    const [year, month, day] = dateOfBirth.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() + 1 - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }

    if (age < 18) {
      setError("You must be at least 18 years old to use SameVibe.");
      return;
    }

    updateComplianceMutation.mutate({
      dateOfBirth,
      termsVersion: CURRENT_TERMS_VERSION
    });
  };

  if (updateComplianceMutation.isPending) {
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
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#9b87f5]/20 blur-[120px]" />
      </div>

      <Card className="w-full max-w-md bg-card/40 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Action Required
          </CardTitle>
          <CardDescription className="text-white/60">
            SameVibe is a community strictly for adults. Please verify your age and accept our updated terms to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <div className="relative">
                <Input
                  id="dateOfBirth"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e: any) => setDateOfBirth(e.target.value)}
                  className="bg-black/20 border-white/10 focus-visible:ring-primary/30 min-h-[48px]"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <p className="text-xs text-white/40 ml-1">You must be 18 or older to join.</p>
            </div>

            <div className="flex items-start space-x-3 p-4 rounded-xl bg-black/20 border border-white/5">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked: any) => setTermsAccepted(checked === true)}
                className="mt-1 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <div className="space-y-1 leading-none">
                <Label 
                  htmlFor="terms" 
                  className="text-sm font-medium text-white/90 leading-normal cursor-pointer"
                >
                  I am at least 18 years old and accept the{" "}
                  <Link href="/terms">
                    <span className="text-primary hover:underline cursor-pointer relative z-10">Terms of Service</span>
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy">
                    <span className="text-primary hover:underline cursor-pointer relative z-10">Privacy Policy</span>
                  </Link>.
                </Label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full min-h-[48px] text-base font-semibold transition-all active:scale-[0.98]"
              disabled={!dateOfBirth || !termsAccepted || updateComplianceMutation.isPending}
            >
              Continue to SameVibe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
