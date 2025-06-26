import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Music, Mountain, Utensils, Book, Palette, Camera, Code, Coffee, Heart } from "lucide-react";

const interestOptions = [
  { id: "fitness", label: "Fitness & Gym", icon: Dumbbell, color: "text-orange-500" },
  { id: "music", label: "Music & Concerts", icon: Music, color: "text-purple-500" },
  { id: "outdoor", label: "Hiking & Nature", icon: Mountain, color: "text-green-500" },
  { id: "food", label: "Food & Dining", icon: Utensils, color: "text-yellow-500" },
  { id: "books", label: "Book Clubs", icon: Book, color: "text-blue-500" },
  { id: "arts", label: "Arts & Crafts", icon: Palette, color: "text-pink-500" },
  { id: "photography", label: "Photography", icon: Camera, color: "text-indigo-500" },
  { id: "technology", label: "Tech Meetups", icon: Code, color: "text-cyan-500" },
  { id: "coffee", label: "Coffee Culture", icon: Coffee, color: "text-amber-500" },
  { id: "wellness", label: "Wellness & Yoga", icon: Heart, color: "text-rose-500" },
];

interface OnboardingQuizProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function OnboardingQuiz({ onComplete, onBack }: OnboardingQuizProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (interests: string[]) => {
      if (!user) throw new Error("No user found");
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, { interests });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Welcome to TriPlace!",
        description: "Your interests have been saved. Let's find your community!",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save your interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId) 
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleNext = () => {
    if (currentStep === 1 && selectedInterests.length === 0) {
      toast({
        title: "Select at least one interest",
        description: "This helps us recommend the best communities for you.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep === 1) {
      updateUserMutation.mutate(selectedInterests);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep === 1) {
      onBack?.();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progressValue = (currentStep / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-900 py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Let's personalize your experience
          </h2>
          <p className="text-gray-400">
            Help us find the perfect communities and events for you
          </p>
          <div className="mt-6">
            <Progress value={progressValue} className="w-full h-2" />
            <p className="text-sm text-gray-500 mt-2">Step {currentStep} of 3</p>
          </div>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">What are your interests?</CardTitle>
            <CardDescription className="text-gray-400">
              Select all that apply - we'll use these to recommend communities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {interestOptions.map((interest) => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);
                
                return (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`
                      border rounded-xl py-3 px-4 text-sm font-medium transition-all duration-200 text-left
                      ${isSelected 
                        ? 'bg-primary border-primary text-white' 
                        : 'bg-gray-700 hover:bg-primary/10 border-gray-600 hover:border-primary/40 text-gray-300'
                      }
                    `}
                  >
                    <Icon className={`${interest.color} mr-2 h-4 w-4 inline-block`} />
                    {interest.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button
                onClick={handlePrevious}
                variant="outline"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={updateUserMutation.isPending}
                className="px-8 py-3 bg-primary hover:bg-primary/90"
              >
                {updateUserMutation.isPending ? "Saving..." : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
