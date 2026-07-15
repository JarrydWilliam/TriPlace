import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/telemetry";
import { ChevronRight, ChevronLeft, Check, Sparkles, MapPin, Search } from "lucide-react";
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
    question: "What brings you to SameVibe?",
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
    id: "personalityVibe",
    question: "What's your social vibe?",
    subtitle: "Be honest, there's no wrong answer.",
    type: "single",
    options: [
      { value: "extrovert", label: "Life of the party", emoji: "🎉", description: "Energized by large groups" },
      { value: "introvert", label: "Quiet observer", emoji: "🦉", description: "Prefer small groups or 1-on-1" },
      { value: "ambivert", label: "Social chameleon", emoji: "🦎", description: "Depends on the day and the people" },
      { value: "thinker", label: "Deep thinker", emoji: "🤔", description: "Always analyzing and observing" }
    ]
  },
  {
    id: "activityLevel",
    question: "How active do you want to be?",
    subtitle: "Match your energy to the community.",
    type: "single",
    options: [
      { value: "very-active", label: "In the mix", emoji: "🔥", description: "Attending events, leading chats" },
      { value: "casual", label: "Casual participant", emoji: "☕", description: "Pop in when free, low pressure" },
      { value: "lurker", label: "Observer", emoji: "👀", description: "Just want to read and learn" },
      { value: "creator", label: "Creator / Organizer", emoji: "🛠️", description: "Ready to start projects" }
    ]
  },
  {
    id: "availability",
    question: "When are you usually free?",
    subtitle: "Select all that apply.",
    type: "multiple",
    maxSelections: 3,
    options: [
      { value: "weekdays", label: "Weekdays (9-5)", emoji: "☀️" },
      { value: "weeknights", label: "Weeknights", emoji: "🌙" },
      { value: "weekends", label: "Weekends", emoji: "🎉" },
      { value: "anytime", label: "Flexible", emoji: "⏰" }
    ]
  },
  {
    id: "resonateStatement",
    question: "Which statement resonates with you most right now?",
    subtitle: "A vibe check.",
    type: "single",
    options: [
      { value: "deep-talks", label: "I prefer deep 1-on-1 conversations over big groups", emoji: "🗣️" },
      { value: "doer", label: "I bond with people by doing activities together", emoji: "🏃" },
      { value: "listener", label: "I'm a great listener and observer", emoji: "👂" },
      { value: "organizer", label: "I love organizing and bringing people together", emoji: "📋" }
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
  const { latitude, longitude, locationName, error: locationError } = useGeolocation(user?.id);
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

  // Location step: show manual entry after 8s if GPS hasn't resolved
  const [locationGpsTimeout, setLocationGpsTimeout] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start 8-second GPS timeout when we reach the location step
  useEffect(() => {
    const isLocationStep = QUIZ_SECTIONS[step]?.id === "location";
    if (isLocationStep && !locationName) {
      if (locationError) {
        // If GPS/IP failed already, don't wait 8 seconds
        setLocationGpsTimeout(true);
        setShowManualInput(true);
      } else {
        gpsTimerRef.current = setTimeout(() => {
          setLocationGpsTimeout(true);
          setShowManualInput(true);
        }, 8000);
      }
    }
    return () => {
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    };
  }, [step, locationName, locationError]);

  // Auto-detect location for that step — cancel timer if GPS succeeds
  useEffect(() => {
    if (locationName && !answers.location) {
      setAnswers(prev => ({ ...prev, location: locationName }));
      setLocationGpsTimeout(false);
      setShowManualInput(false);
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    }
  }, [locationName]);

  const handleManualLocationSubmit = () => {
    const trimmed = manualLocationInput.trim();
    if (trimmed.length < 2) return;
    setAnswers(prev => ({ ...prev, location: trimmed }));
  };

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
          toast({
            title: "Limit reached",
            description: `You can only select up to ${question.maxSelections} options.`,
          });
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
    <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-y-auto relative flex flex-col items-center justify-center">
      {/* Rich background bokeh matching Login */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="absolute top-0 w-full px-6 pt-safe flex justify-between items-center z-20" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 24px)" }}>
        <Logo size="sm" />
        {/* Dot step indicators */}
        <div className="flex items-center gap-1.5">
          {QUIZ_SECTIONS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 h-2 bg-primary"
                  : i < step
                  ? "w-2 h-2 bg-primary/60"
                  : "w-2 h-2 bg-white/20"
              }`}
            />
          ))}
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
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="text-xs font-medium text-primary uppercase tracking-widest">
                Step {step + 1} of {QUIZ_SECTIONS.length}
              </span>
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground shadow-sm">
              {currentQ.question}
            </h1>
            <p className="text-lg text-muted-foreground">{currentQ.subtitle}</p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3 mb-8">
              {currentQ.id === "location" ? (
              // Location Step — auto-detect with manual fallback
              <div className="glass-card p-6 rounded-xl border border-white/10 text-center space-y-5">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  answers.location ? "bg-green-500/20" : "bg-blue-500/20 animate-pulse"
                }`}>
                  <MapPin className={`w-8 h-8 ${answers.location ? "text-green-400" : "text-blue-400"}`} />
                </div>

                {answers.location ? (
                  // GPS success or manual entry confirmed
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-400" />
                      <h3 className="text-xl font-semibold text-white">{answers.location}</h3>
                    </div>
                    <p className="text-sm text-white/40">We'll find communities near you.</p>
                    <button
                      onClick={() => {
                        setAnswers(prev => ({ ...prev, location: "" }));
                        setShowManualInput(true);
                      }}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors mt-3 underline underline-offset-2"
                    >
                      Change location
                    </button>
                  </div>
                ) : showManualInput ? (
                  // Manual entry UI
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Where are you based?</h3>
                      <p className="text-sm text-white/40">Enter your city and state or country.</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={manualLocationInput}
                        onChange={(e) => setManualLocationInput(e.target.value)}
                        placeholder="e.g. Denver, CO"
                        className="flex-1 px-4 min-h-[46px] bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleManualLocationSubmit();
                        }}
                        autoFocus
                      />
                      <Button
                        onClick={handleManualLocationSubmit}
                        disabled={manualLocationInput.trim().length < 2}
                        className="bg-primary hover:bg-primary/90 text-white px-4"
                      >
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // GPS detecting state
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Detecting location...
                    </h3>
                    <p className="text-sm text-white/40 mt-1">
                      We use this to find communities near you.
                    </p>
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="mt-4 text-sm text-white/50 hover:text-white border border-white/10 rounded-full px-4 py-2 transition-all hover:bg-white/10"
                    >
                      Enter manually instead
                    </button>
                  </div>
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
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(option.value)}
                    className={`
                      group relative w-full p-4 rounded-2xl text-left transition-all duration-200
                      flex items-center gap-4 min-h-[64px]
                      ${
                        isSelected
                          ? "bg-card/40 backdrop-blur-xl border border-primary shadow-sm scale-[1.01]"
                          : "bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10"
                      }
                    `}
                  >
                    {/* Emoji circle — larger, branded */}
                    <div className={`
                      w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0
                      transition-all duration-200
                      ${
                        isSelected
                          ? "bg-primary/30 shadow-[inset_0_0_10px_rgba(124,58,237,0.3)]"
                          : "bg-white/8 group-hover:bg-white/12"
                      }
                    `}>
                      {option.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-semibold text-base leading-tight ${
                          isSelected ? "text-foreground" : "text-foreground/80"
                        }`}>
                          {option.label}
                        </span>
                        {/* Animated checkmark */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-white/10"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      {option.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
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
              className={`text-muted-foreground hover:text-foreground hover:bg-white/5 ${step === 0 ? 'opacity-0' : 'opacity-100'}`}
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