import { useAuth } from "@/lib/auth-context";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, MapPin, Heart, Target, Calendar, Users, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { Logo } from "@/components/ui/logo";
import { 
  MobileLayout, 
  MobileHeader, 
  MobileContent,
  MobileCard,
  MobileButton
} from "@/components/layout/mobile-layout";

// Quiz questions data
const quizSections = [
  {
    title: "Your Past Journey",
    description: "Tell us about your background and experiences",
    questions: [
      {
        id: "hometown",
        type: "text",
        question: "Where did you grow up?",
        placeholder: "City, State/Country"
      },
      {
        id: "education",
        type: "select",
        question: "What's your educational background?",
        options: ["High School", "Some College", "Bachelor's Degree", "Master's Degree", "PhD", "Trade School", "Self-taught", "Other"]
      },
      {
        id: "career_field",
        type: "select",
        question: "What field do you work in?",
        options: ["Technology", "Healthcare", "Education", "Finance", "Arts/Creative", "Business", "Non-profit", "Government", "Retail", "Manufacturing", "Student", "Retired", "Other"]
      }
    ]
  },
  {
    title: "Your Present Life",
    description: "Help us understand your current situation and interests",
    questions: [
      {
        id: "living_situation",
        type: "select",
        question: "What's your current living situation?",
        options: ["Live alone", "With roommates", "With family", "With partner/spouse", "With children", "Other"]
      },
      {
        id: "free_time",
        type: "textarea",
        question: "How do you typically spend your free time?",
        placeholder: "Describe your hobbies, activities, or interests..."
      },
      {
        id: "current_interests",
        type: "multiselect",
        question: "What are you interested in right now? (Select all that apply)",
        options: [
          "Fitness & Wellness", "Technology", "Arts & Crafts", "Music", "Food & Cooking", 
          "Outdoor Activities", "Reading", "Gaming", "Travel", "Photography", "Sports", 
          "Volunteering", "Learning new skills", "Networking", "Meditation", "Dancing"
        ]
      }
    ]
  },
  {
    title: "Your Future Goals",
    description: "Share your aspirations and what you hope to achieve",
    questions: [
      {
        id: "life_goals",
        type: "multiselect",
        question: "What are your main life goals? (Select all that apply)",
        options: [
          "Build meaningful friendships", "Advance my career", "Learn new skills", "Stay healthy and fit",
          "Travel more", "Start a family", "Buy a home", "Start a business", "Give back to community",
          "Find work-life balance", "Pursue creative projects", "Build financial security"
        ]
      },
      {
        id: "community_goals",
        type: "textarea",
        question: "What do you hope to get from joining communities?",
        placeholder: "Share what you're looking for in community connections..."
      },
      {
        id: "ideal_weekend",
        type: "textarea",
        question: "Describe your ideal weekend:",
        placeholder: "What would make you feel energized and fulfilled?"
      }
    ]
  },
  {
    title: "Your Preferences",
    description: "Help us personalize your experience",
    questions: [
      {
        id: "social_energy",
        type: "select",
        question: "How would you describe your social energy?",
        options: ["I love big groups and parties", "I prefer small intimate gatherings", "I like a mix of both", "I prefer one-on-one connections", "I'm more of an observer"]
      },
      {
        id: "communication_style",
        type: "select",
        question: "How do you prefer to communicate?",
        options: ["Face-to-face conversations", "Text messaging", "Video calls", "Voice calls", "Email", "Social media", "Mix of everything"]
      },
      {
        id: "event_preferences",
        type: "multiselect",
        question: "What types of events interest you? (Select all that apply)",
        options: [
          "Workshop/Learning sessions", "Social mixers", "Outdoor adventures", "Sports activities",
          "Cultural events", "Food experiences", "Volunteer opportunities", "Creative workshops",
          "Professional networking", "Wellness activities", "Game nights", "Book clubs"
        ]
      }
    ]
  },
  {
    title: "Personal Insights",
    description: "Help us understand what makes you unique",
    questions: [
      {
        id: "personality_traits",
        type: "multiselect",
        question: "Which traits best describe you? (Select 3-5)",
        options: [
          "Creative", "Analytical", "Empathetic", "Adventurous", "Organized", "Spontaneous",
          "Introverted", "Extroverted", "Curious", "Practical", "Optimistic", "Thoughtful",
          "Ambitious", "Laid-back", "Detail-oriented", "Big-picture thinker"
        ]
      },
      {
        id: "values",
        type: "multiselect",
        question: "What values are most important to you? (Select all that apply)",
        options: [
          "Authenticity", "Growth", "Connection", "Innovation", "Tradition", "Adventure",
          "Security", "Freedom", "Creativity", "Service", "Excellence", "Balance",
          "Integrity", "Collaboration", "Independence", "Community"
        ]
      },
      {
        id: "motivation",
        type: "textarea",
        question: "What motivates you most in life?",
        placeholder: "Share what drives and inspires you..."
      }
    ]
  }
];

export default function OnboardingMobile() {
  const { user, loading: authLoading } = useAuth();
  const { latitude, longitude, locationName } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async (quizAnswers: any) => {
      const response = await apiRequest("POST", "/api/users/complete-onboarding", {
        quizAnswers,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        location: locationName
      });
      if (!response.ok) throw new Error("Failed to complete onboarding");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to TriPlace!",
        description: "Your profile is complete. Let's find your communities!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      setLocation('/dashboard');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentSectionData = quizSections[currentSection];
  const currentQuestionData = currentSectionData?.questions[currentQuestion];
  const totalQuestions = quizSections.reduce((sum, section) => sum + section.questions.length, 0);
  const completedQuestions = quizSections.slice(0, currentSection).reduce((sum, section) => sum + section.questions.length, 0) + currentQuestion;
  const progress = (completedQuestions / totalQuestions) * 100;

  const handleAnswer = (value: any) => {
    if (currentQuestionData?.type === 'multiselect') {
      const currentAnswers = answers[currentQuestionData.id] || [];
      const newAnswers = currentAnswers.includes(value)
        ? currentAnswers.filter((a: any) => a !== value)
        : [...currentAnswers, value];
      setAnswers({ ...answers, [currentQuestionData.id]: newAnswers });
    } else {
      setAnswers({ ...answers, [currentQuestionData.id]: value });
    }
  };

  const handleNext = () => {
    if (currentQuestion < currentSectionData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentSection < quizSections.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentQuestion(0);
    } else {
      // Complete onboarding
      completeOnboardingMutation.mutate(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setCurrentQuestion(quizSections[currentSection - 1].questions.length - 1);
    }
  };

  const canProceed = () => {
    const answer = answers[currentQuestionData?.id];
    if (currentQuestionData?.type === 'multiselect') {
      return answer && answer.length > 0;
    }
    return answer && answer.toString().trim().length > 0;
  };

  const isLastQuestion = currentSection === quizSections.length - 1 && 
                        currentQuestion === currentSectionData.questions.length - 1;

  if (authLoading) {
    return (
      <MobileLayout>
        <MobileContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </MobileContent>
      </MobileLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <MobileLayout className="bg-background">
      {/* Mobile Header */}
      <MobileHeader>
        <div className="flex items-center space-x-3">
          <Logo size="sm" />
          <div className="flex flex-col flex-1">
            <h1 className="text-lg font-semibold">Welcome to TriPlace</h1>
            <div className="text-xs text-muted-foreground">
              Building your community profile
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted-foreground">
            {completedQuestions + 1}/{totalQuestions}
          </div>
        </div>
      </MobileHeader>

      {/* Mobile Content */}
      <MobileContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Section Info */}
        <MobileCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              {currentSection === 0 && <Calendar className="w-5 h-5 text-primary" />}
              {currentSection === 1 && <Heart className="w-5 h-5 text-primary" />}
              {currentSection === 2 && <Target className="w-5 h-5 text-primary" />}
              {currentSection === 3 && <Users className="w-5 h-5 text-primary" />}
              {currentSection === 4 && <Sparkles className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">{currentSectionData.title}</h2>
              <p className="text-sm text-muted-foreground">{currentSectionData.description}</p>
            </div>
          </div>
        </MobileCard>

        {/* Question Card */}
        <MobileCard>
          <div className="space-y-4">
            <h3 className="text-lg font-medium leading-relaxed">
              {currentQuestionData?.question}
            </h3>

            {/* Question Input */}
            <div className="space-y-3">
              {currentQuestionData?.type === 'text' && (
                <Input
                  value={answers[currentQuestionData.id] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={currentQuestionData.placeholder}
                  className="text-base"
                />
              )}

              {currentQuestionData?.type === 'textarea' && (
                <Textarea
                  value={answers[currentQuestionData.id] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={currentQuestionData.placeholder}
                  className="min-h-[100px] text-base"
                />
              )}

              {currentQuestionData?.type === 'select' && (
                <div className="space-y-2">
                  {currentQuestionData.options?.map((option) => (
                    <MobileCard
                      key={option}
                      clickable
                      padding={false}
                      className={`p-3 cursor-pointer transition-all ${
                        answers[currentQuestionData.id] === option
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => handleAnswer(option)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestionData.id] === option
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}>
                          {answers[currentQuestionData.id] === option && (
                            <Check className="w-2 h-2 text-primary-foreground" />
                          )}
                        </div>
                        <span className="text-sm">{option}</span>
                      </div>
                    </MobileCard>
                  ))}
                </div>
              )}

              {currentQuestionData?.type === 'multiselect' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">Select all that apply</p>
                  {currentQuestionData.options?.map((option) => {
                    const isSelected = (answers[currentQuestionData.id] || []).includes(option);
                    return (
                      <MobileCard
                        key={option}
                        clickable
                        padding={false}
                        className={`p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => handleAnswer(option)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}>
                            {isSelected && (
                              <Check className="w-2 h-2 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-sm">{option}</span>
                        </div>
                      </MobileCard>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </MobileCard>

        {/* Location Info */}
        {locationName && (
          <MobileCard className="bg-muted/20">
            <div className="flex items-center space-x-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Your location:</span>
              <span className="font-medium">{locationName}</span>
            </div>
          </MobileCard>
        )}
      </MobileContent>

      {/* Navigation Footer */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center justify-between space-x-3">
          <MobileButton
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentSection === 0 && currentQuestion === 0}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </MobileButton>

          <MobileButton
            onClick={handleNext}
            disabled={!canProceed() || completeOnboardingMutation.isPending}
            className="flex-1"
          >
            {completeOnboardingMutation.isPending ? (
              "Completing..."
            ) : isLastQuestion ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </MobileButton>
        </div>
      </div>
    </MobileLayout>
  );
}