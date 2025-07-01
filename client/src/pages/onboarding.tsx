import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { ComponentLoadingSpinner } from "@/components/loading-spinner";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useGeolocation } from "@/hooks/use-geolocation";

interface QuizAnswers {
  // Section 1: Get to Know You
  hopingToFind: string[];
  communityFeel: string;
  personalityVibe: string;
  
  // Section 2: Interests & Passions
  interestSpaces: string[];
  
  // Section 3: Time & Energy
  activityLevel: string;
  availability: string[];
  
  // Section 4: Location & Matching
  location: string;
  digitalOnly: string;
  
  // Section 5: Values Layer
  resonateStatement: string;
}

const QUIZ_SECTIONS = [
  {
    title: "Get to Know You",
    description: "Let's understand what you're looking for",
    questions: [
      {
        id: "hopingToFind",
        question: "What are you hoping to find here?",
        subtitle: "Choose up to 3",
        type: "multiple",
        maxSelections: 3,
        options: [
          { value: "real-friendships", label: "Real friendships", emoji: "👯‍♀️" },
          { value: "thoughtful-convos", label: "Safe, thoughtful convos", emoji: "💬" },
          { value: "local-events", label: "Local events & hangouts", emoji: "🎉" },
          { value: "collaborators", label: "Collaborators or builders", emoji: "🤝" },
          { value: "personal-growth", label: "Personal growth or support", emoji: "✨" },
          { value: "chill-place", label: "Chill place to check in", emoji: "🌱" }
        ]
      },
      {
        id: "communityFeel",
        question: "How do you want to feel in a community?",
        subtitle: "One pick - sets tone of community matching",
        type: "single",
        options: [
          { value: "seen-supported", label: "Seen & supported" },
          { value: "inspired-challenged", label: "Inspired & challenged" },
          { value: "comfortable-being-me", label: "Comfortable just being me" },
          { value: "energized-excited", label: "Energized & excited" },
          { value: "curious-open", label: "Curious & open" }
        ]
      },
      {
        id: "personalityVibe",
        question: "What's your vibe IRL?",
        subtitle: "Helps match personality dynamics",
        type: "single",
        options: [
          { value: "low-key-introverted", label: "Low-key / introverted", emoji: "🧘‍♂️" },
          { value: "creative-open", label: "Creative / open-minded", emoji: "🦄" },
          { value: "driven-ambitious", label: "Driven / ambitious", emoji: "📈" },
          { value: "warm-social", label: "Warm / social", emoji: "🤗" },
          { value: "light-hearted", label: "Light-hearted / funny", emoji: "😂" },
          { value: "deep-thinker", label: "Deep thinker", emoji: "🤓" }
        ]
      }
    ]
  },
  {
    title: "Interests & Passions",
    description: "Pick spaces you'd vibe in",
    questions: [
      {
        id: "interestSpaces",
        question: "Pick a few spaces you'd vibe in",
        subtitle: "Choose 3-6 max",
        type: "multiple",
        maxSelections: 6,
        minSelections: 3,
        options: [
          { value: "ai-tech", label: "AI & Tech", emoji: "🔬" },
          { value: "art-design", label: "Art & Design", emoji: "🎨" },
          { value: "startup-builders", label: "Startup Builders", emoji: "💻" },
          { value: "mental-wellness", label: "Mental Wellness", emoji: "🧠" },
          { value: "social-impact", label: "Social Impact", emoji: "🌎" },
          { value: "mindfulness", label: "Mindfulness", emoji: "🧘" },
          { value: "music-scenes", label: "Music Scenes", emoji: "🎶" },
          { value: "bookworms", label: "Bookworms", emoji: "📚" },
          { value: "lgbtq-spaces", label: "LGBTQ+ spaces", emoji: "🏳️‍🌈" },
          { value: "outdoors-adventure", label: "Outdoors & Adventure", emoji: "🥾" },
          { value: "gaming", label: "Gaming", emoji: "🎮" },
          { value: "cooking-culture", label: "Cooking & Culture", emoji: "🍳" },
          { value: "students-learners", label: "Students & Learners", emoji: "🧑‍🎓" },
          { value: "parents-families", label: "Parents & Families", emoji: "👶" }
        ]
      }
    ]
  },
  {
    title: "Time & Energy",
    description: "Filter by activity level & availability",
    questions: [
      {
        id: "activityLevel",
        question: "How active do you want your communities to be?",
        type: "single",
        options: [
          { value: "super-active", label: "Super active — daily convos", emoji: "🔥" },
          { value: "just-enough", label: "Just enough — a few posts a week", emoji: "💬" },
          { value: "chill-pace", label: "Chill pace — low volume", emoji: "🧘" },
          { value: "mostly-browsing", label: "Mostly browsing for now", emoji: "👀" }
        ]
      },
      {
        id: "availability",
        question: "When are you usually around?",
        type: "multiple",
        options: [
          { value: "weekday-evenings", label: "Weekday evenings" },
          { value: "weekends", label: "Weekends" },
          { value: "early-mornings", label: "Early mornings" },
          { value: "late-nights", label: "Late nights" },
          { value: "random", label: "Randomly / no set time" }
        ]
      }
    ]
  },
  {
    title: "Location & Matching",
    description: "Where you want to connect",
    questions: [
      {
        id: "digitalOnly",
        question: "Are you open to digital-only spaces too?",
        type: "single",
        options: [
          { value: "yes-anywhere", label: "Yes, anywhere with my vibe" },
          { value: "local-only", label: "Local only" },
          { value: "both", label: "Both" }
        ]
      }
    ]
  },
  {
    title: "Values Layer",
    description: "Optional but helps with deep matching",
    questions: [
      {
        id: "resonateStatement",
        question: "Which statement resonates most with you?",
        type: "single",
        options: [
          { value: "grow-explore", label: "I want to grow and explore new parts of myself." },
          { value: "feel-understood", label: "I need a space to feel understood." },
          { value: "find-people", label: "I'm excited to find people who get me." },
          { value: "building-something", label: "I'm building something and want others on the path." },
          { value: "chill-friends", label: "I'm just here to chill and maybe make a friend or two." }
        ]
      }
    ]
  }
];

export default function Onboarding() {
  const { user } = useAuth();
  const { latitude, longitude, locationName } = useGeolocation(user?.id);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    hopingToFind: [],
    communityFeel: "",
    personalityVibe: "",
    interestSpaces: [],
    activityLevel: "",
    availability: [],
    location: "",
    digitalOnly: "",
    resonateStatement: ""
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set location when geolocation is available
  useEffect(() => {
    if (locationName && !answers.location) {
      setAnswers(prev => ({ ...prev, location: locationName }));
    }
  }, [locationName, answers.location]);

  const submitQuizMutation = useMutation({
    mutationFn: async (quizData: QuizAnswers) => {
      const response = await apiRequest("POST", "/api/onboarding/complete", {
        ...quizData,
        latitude,
        longitude,
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to TriPlace!",
        description: "Your communities are being personalized based on your responses."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const currentSectionData = QUIZ_SECTIONS[currentSection];
  const currentQuestionData = currentSectionData.questions[currentQuestion];
  const totalQuestions = QUIZ_SECTIONS.reduce((sum, section) => sum + section.questions.length, 0);
  const completedQuestions = QUIZ_SECTIONS.slice(0, currentSection).reduce((sum, section) => sum + section.questions.length, 0) + currentQuestion;
  const progress = (completedQuestions / totalQuestions) * 100;

  const canProceed = () => {
    const answer = answers[currentQuestionData.id as keyof QuizAnswers];
    if (currentQuestionData.type === "multiple") {
      const arrayAnswer = answer as string[];
      const minSelections = currentQuestionData.minSelections || 1;
      const maxSelections = currentQuestionData.maxSelections || Infinity;
      return arrayAnswer.length >= minSelections && arrayAnswer.length <= maxSelections;
    }
    return answer && answer !== "";
  };

  const handleNext = () => {
    if (currentQuestion < currentSectionData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentSection < QUIZ_SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentQuestion(0);
    } else {
      // Complete quiz
      submitQuizMutation.mutate(answers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setCurrentQuestion(QUIZ_SECTIONS[currentSection - 1].questions.length - 1);
    }
  };

  const isFirstQuestion = currentSection === 0 && currentQuestion === 0;
  const isLastQuestion = currentSection === QUIZ_SECTIONS.length - 1 && 
                         currentQuestion === currentSectionData.questions.length - 1;

  const handleRefresh = async () => {
    // Reset to beginning
    setCurrentSection(0);
    setCurrentQuestion(0);
    setAnswers({
      hopingToFind: [],
      communityFeel: "",
      personalityVibe: "",
      interestSpaces: [],
      activityLevel: "",
      availability: [],
      location: locationName || "",
      digitalOnly: "",
      resonateStatement: ""
    });
  };

  if (submitQuizMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <ComponentLoadingSpinner />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="mobile-page-container min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <Logo size="lg" className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Let's find your digital third place
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {currentSectionData.description}
            </p>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Section {currentSection + 1} of {QUIZ_SECTIONS.length}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(progress)}% complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">
                {currentQuestionData.question}
              </CardTitle>
              {currentQuestionData.subtitle && (
                <CardDescription>
                  {currentQuestionData.subtitle}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentQuestionData.options.map((option) => {
                  const isSelected = currentQuestionData.type === "multiple" 
                    ? (answers[currentQuestionData.id as keyof QuizAnswers] as string[])?.includes(option.value)
                    : answers[currentQuestionData.id as keyof QuizAnswers] === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (currentQuestionData.type === "multiple") {
                          const currentValues = (answers[currentQuestionData.id as keyof QuizAnswers] as string[]) || [];
                          let newValues;
                          if (isSelected) {
                            newValues = currentValues.filter(v => v !== option.value);
                          } else {
                            const maxSelections = currentQuestionData.maxSelections || Infinity;
                            if (currentValues.length < maxSelections) {
                              newValues = [...currentValues, option.value];
                            } else {
                              return; // Don't add if at max
                            }
                          }
                          handleAnswer(currentQuestionData.id, newValues);
                        } else {
                          handleAnswer(currentQuestionData.id, option.value);
                        }
                      }}
                      className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {option.emoji && (
                          <span className="text-2xl">{option.emoji}</span>
                        )}
                        <span className="text-gray-900 dark:text-white font-medium">
                          {option.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Location display for location section */}
              {currentQuestionData.id === "digitalOnly" && locationName && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                      Location detected: {locationName}
                    </span>
                  </div>
                </div>
              )}

              {/* Selection counter for multi-select */}
              {currentQuestionData.type === "multiple" && (
                <div className="mt-4 text-center">
                  <Badge variant="outline">
                    {(answers[currentQuestionData.id as keyof QuizAnswers] as string[])?.length || 0} 
                    {currentQuestionData.maxSelections && ` / ${currentQuestionData.maxSelections}`} selected
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstQuestion}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2"
            >
              <span>{isLastQuestion ? "Complete" : "Next"}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}