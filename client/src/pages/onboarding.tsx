import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/telemetry";
import { ChevronRight, ChevronLeft, Check, Sparkles, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useGeolocation } from "@/hooks/use-geolocation";

// Types
interface QuizAnswers {
  hopingToFind: string[];
  communityFeel: string;
  personalityVibe: string;
  interestSpaces: string[];
  activityLevel: string;
  availability: string[];
  location: string;
  digitalOnly: string;
  resonateStatement: string;
}

interface QuizOption {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
}

interface QuizQuestion {
  id: keyof QuizAnswers;
  question: string;
  subtitle: string;
  type: "single" | "multiple";
  maxSelections?: number;
  options: QuizOption[];
}

// ------------------------------------------------------------------
// DATA: The "High-End" Content
// ------------------------------------------------------------------
const QUIZ_SECTIONS: QuizQuestion[] = [
  {
    id: "hopingToFind",
    question: "What brings you to TriPlace?",
    subtitle: "Select up to 3 that resonate most.",
    type: "multiple",
    maxSelections: 3,
    options: [
      { value: "real-friendships", label: "Real Connection", emoji: "🤝", description: "Genuine friendships beyond the screen" },
      { value: "local-events", label: "Local Happenings", emoji: "🎉", description: "Events, pop-ups, and gatherings" },
      { value: "thoughtful-convos", label: "Deep Conversation", emoji: "💬", description: "Meaningful discourse, no small talk" },
      { value: "collaborators", label: "Collaboration", emoji: "⚡", description: "Finding people to build with" },
      { value: "personal-growth", label: "Growth", emoji: "🌱", description: "Support for your personal journey" },
      { value: "chill-place", label: "Just Chilling", emoji: "☕", description: "A low-pressure third place" }
    ]
  },
  {
    id: "interestSpaces",
    question: "Where do you vibe?",
    subtitle: "Pick 3-5 scenes that light you up.",
    type: "multiple",
    maxSelections: 5,
    options: [
      { value: "ai-tech", label: "Future Tech", emoji: "🤖" },
      { value: "art-design", label: "Creative Arts", emoji: "🎨" },
      { value: "outdoors-adventure", label: "Wild & Free", emoji: "🌲" },
      { value: "mindfulness", label: "Mindfulness", emoji: "🧘" },
      { value: "music-scenes", label: "Music Culture", emoji: "🎵" },
      { value: "bookworms", label: "Literature", emoji: "📚" },
      { value: "startup-builders", label: "Founders", emoji: "🚀" },
      { value: "social-impact", label: "Change Makers", emoji: "🌍" },
      { value: "gaming", label: "Gaming", emoji: "🎮" },
      { value: "cooking", label: "Culinary", emoji: "🍳" }
    ]
  },
  {
    id: "communityFeel",
    question: "What's your ideal atmosphere?",
    subtitle: "This helps us match the right energy.",
    type: "single",
    options: [
      { value: "seen-supported", label: "Warm & Supportive", emoji: "🤗", description: "A safe space to land" },
      { value: "inspired-challenged", label: "High Energy & Growth", emoji: "🔥", description: "Pushing boundaries together" },
      { value: "curious-open", label: "Curious & Exploratory", emoji: "🔭", description: "Always learning something new" },
      { value: "chill-lowkey", label: "Laid Back", emoji: "🍃", description: "Low pressure, good vibes" }
    ]
  },
  {
    id: "location",
    question: "Where are you based?",
    subtitle: "To find local gems around you.",
    type: "single", // Special case handled in render
    options: [] // Populated dynamically or handled via input
  }
];

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const { latitude, longitude, locationName } = useGeolocation(user?.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0);
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

  // Auto-detect location for that step
  useEffect(() => {
    if (locationName && !answers.location) {
      setAnswers(prev => ({ ...prev, location: locationName }));
    }
  }, [locationName]);

  const submitQuizMutation = useMutation({
    mutationFn: async (data: QuizAnswers) => {
      const res = await apiRequest("POST", "/api/onboarding/complete", {
        ...data,
        latitude,
        longitude,
        userId: user?.id
      });
      return res.json();
    },
    onSuccess: async () => {
      trackEvent('quiz_complete', { userId: user?.id });
      await refreshUser();
      // Redirect to cinematic reveal — the "Familiar but New" moment
      setLocation("/reveal");
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSelect = (value: string) => {
    const question = QUIZ_SECTIONS[step];
    
    if (question.id === "location") return; // Handled separately

    if (question.type === "single") {
      setAnswers(prev => ({ ...prev, [question.id]: value }));
      // Auto-advance for single select after a brief pause for effect
      setTimeout(() => handleNext(), 250);
    } else {
      setAnswers(prev => {
        const current = (prev[question.id] as string[]) || [];
        if (current.includes(value)) {
          return { ...prev, [question.id]: current.filter(v => v !== value) };
        }
        if (question.maxSelections && current.length >= question.maxSelections) {
          return prev;
        }
        return { ...prev, [question.id]: [...current, value] };
      });
    }
  };

  const handleNext = () => {
    if (step < QUIZ_SECTIONS.length - 1) {
      setStep(step + 1);
    } else {
      submitQuizMutation.mutate(answers);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // Helper to check if current step is valid to proceed
  const canProceed = () => {
    const q = QUIZ_SECTIONS[step];
    if (q.id === "location") return !!answers.location;
    
    const ans = answers[q.id];
    if (Array.isArray(ans)) return ans.length > 0;
    return !!ans;
  };

  const progress = ((step + 1) / QUIZ_SECTIONS.length) * 100;
  const currentQ = QUIZ_SECTIONS[step];

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-hidden relative flex flex-col items-center justify-center">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-black to-black z-0" />
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent opacity-50 z-0 pointer-events-none" />

      {/* Header */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20">
        <Logo size="sm" />
        <div className="w-32">
          <Progress value={progress} className="h-1 bg-white/10" />
        </div>
      </div>

      {/* Main Content Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-lg px-6 z-10"
        >
          <div className="mb-8 text-center space-y-2">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="inline-flex items-center justify-center p-2 bg-white/5 rounded-full mb-4 border border-white/10"
            >
              <Sparkles className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-xs font-medium text-purple-200 uppercase tracking-widest">
                Step {step + 1} of {QUIZ_SECTIONS.length}
              </span>
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
              {currentQ.question}
            </h1>
            <p className="text-lg text-white/50">{currentQ.subtitle}</p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            {currentQ.id === "location" ? (
              // Special Location Input
              <div className="glass-card p-6 rounded-xl border border-white/10 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <MapPin className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {locationName || "Detecting location..."}
                  </h3>
                  <p className="text-sm text-white/40 mt-1">
                    We use this to find communities near you.
                  </p>
                </div>
                {!locationName && (
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
                    Enter Manually
                  </Button>
                )}
              </div>
            ) : (
              // Standard Options
              currentQ.options.map((option) => {
                const isSelected = Array.isArray(answers[currentQ.id])
                  ? (answers[currentQ.id] as string[]).includes(option.value)
                  : answers[currentQ.id] === option.value;

                return (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(option.value)}
                    className={`
                      group relative w-full p-4 rounded-xl text-left transition-all duration-200 border
                      flex items-center space-x-4
                      ${isSelected 
                        ? "bg-white/10 border-primary/50 shadow-[0_0_15px_rgba(124,58,237,0.3)]" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-lg
                      transition-colors duration-200
                      ${isSelected ? "bg-primary/20" : "bg-white/5 group-hover:bg-white/10"}
                    `}>
                      {option.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isSelected ? "text-white" : "text-white/80"}`}>
                          {option.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      {option.description && (
                        <p className="text-xs text-white/40 mt-0.5 group-hover:text-white/60 transition-colors">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-auto pt-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className={`text-white/40 hover:text-white hover:bg-white/5 ${step === 0 ? 'opacity-0' : 'opacity-100'}`}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || (step === QUIZ_SECTIONS.length - 1 && submitQuizMutation.isPending)}
              className="bg-white text-black hover:bg-white/90 px-8 rounded-full font-semibold shadow-lg shadow-white/10 transition-all hover:scale-105"
            >
              {submitQuizMutation.isPending ? (
                "Creating Profile..."
              ) : step === QUIZ_SECTIONS.length - 1 ? (
                "Finish"
              ) : (
                <>Next <ChevronRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}