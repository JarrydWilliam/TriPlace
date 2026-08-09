import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/telemetry";
import { ChevronRight, ChevronLeft, Check, Sparkles, MapPin, Search, Compass, Flame } from "lucide-react";
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

interface HobbyOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

interface HobbyCatalogResponse {
  mainstream: HobbyOption[];
  emerging: HobbyOption[];
}

interface QuizOption {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  subtitle: string;
  type: "single" | "multiple" | "custom_hobby_mainstream" | "custom_hobby_freeform" | "custom_hobby_emerging";
  maxSelections?: number;
  options: QuizOption[];
}

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
    id: "hobbyMainstream",
    question: "Which hobbies light you up?",
    subtitle: "Select up to 3 mainstream favorites.",
    type: "custom_hobby_mainstream",
    options: []
  },
  {
    id: "hobbyFreeform",
    question: "Top hobbies not listed above?",
    subtitle: "We're always expanding! Tell us what you love.",
    type: "custom_hobby_freeform",
    options: []
  },
  {
    id: "hobbyEmerging",
    question: "Up-and-coming trends catch your eye?",
    subtitle: "Pick any emerging hobbies to explore, or keep your original 3 picks!",
    type: "custom_hobby_emerging",
    options: []
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
    id: "location",
    question: "Where are you based?",
    subtitle: "To find local gems around you.",
    type: "single",
    options: []
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

  // Hobby Quiz State
  const [pickedMainstream, setPickedMainstream] = useState<string[]>([]);
  const [freeformHobby, setFreeformHobby] = useState<string>("");
  const [pickedEmerging, setPickedEmerging] = useState<string[]>([]);

  // Fetch Hobby Catalog from backend
  const { data: hobbyCatalog } = useQuery<HobbyCatalogResponse>({
    queryKey: ["/api/hobbies/catalog"],
    queryFn: async () => {
      const res = await fetch("/api/hobbies/catalog");
      if (!res.ok) throw new Error("Failed to fetch hobbies catalog");
      return res.json();
    },
  });

  // Location step timeouts
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState("");
  const gpsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isLocationStep = QUIZ_SECTIONS[step]?.id === "location";
    if (isLocationStep && !locationName) {
      if (locationError) {
        setShowManualInput(true);
      } else {
        gpsTimerRef.current = setTimeout(() => {
          setShowManualInput(true);
        }, 8000);
      }
    }
    return () => {
      if (gpsTimerRef.current) clearTimeout(gpsTimerRef.current);
    };
  }, [step, locationName, locationError]);

  useEffect(() => {
    if (locationName && !answers.location) {
      setAnswers(prev => ({ ...prev, location: locationName }));
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
      // 1. Submit Hobby Quiz analytics
      await apiRequest("POST", "/api/hobbies/quiz-submit", {
        pickedMainstreamHobbies: pickedMainstream,
        pickedEmergingHobbies: pickedEmerging,
        freeformHobby: freeformHobby.trim() || undefined,
      });

      // 2. Submit onboarding complete payload
      const combinedInterests = Array.from(
        new Set([...pickedMainstream, ...pickedEmerging, ...(freeformHobby.trim() ? [freeformHobby.trim()] : [])])
      );

      const res = await apiRequest("POST", "/api/onboarding/complete", {
        ...data,
        interestSpaces: combinedInterests,
        latitude,
        longitude,
        userId: user?.id
      });
      return res.json();
    },
    onSuccess: async () => {
      trackEvent('quiz_complete', { userId: user?.id });
      await refreshUser();
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

  const toggleMainstreamHobby = (id: string) => {
    setPickedMainstream(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 3) {
        toast({
          title: "Limit reached",
          description: "You can select up to 3 mainstream hobbies.",
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleEmergingHobby = (id: string) => {
    setPickedEmerging(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleSelect = (value: string) => {
    const question = QUIZ_SECTIONS[step];
    if (question.id === "location") return;

    if (question.type === "single") {
      setAnswers(prev => ({ ...prev, [question.id as keyof QuizAnswers]: value }));
      setTimeout(() => handleNext(), 250);
    } else if (question.type === "multiple") {
      setAnswers(prev => {
        const current = (prev[question.id as keyof QuizAnswers] as string[]) || [];
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

  const canProceed = () => {
    const q = QUIZ_SECTIONS[step];
    if (q.id === "location") return !!answers.location;
    if (q.id === "hobbyMainstream") return pickedMainstream.length > 0;
    if (q.id === "hobbyFreeform") return true; // Optional step
    if (q.id === "hobbyEmerging") return true; // Optional step

    const ans = answers[q.id as keyof QuizAnswers];
    if (Array.isArray(ans)) return ans.length > 0;
    return !!ans;
  };

  const currentQ = QUIZ_SECTIONS[step];

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-y-auto relative flex flex-col items-center justify-center">
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="absolute top-0 w-full px-6 pt-safe flex flex-col gap-2 z-20" style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 24px)" }}>
        <div className="flex justify-between items-center">
          <Logo size="sm" />
          <span className="text-xs text-white/40 font-medium tabular-nums">
            {step + 1} / {QUIZ_SECTIONS.length}
          </span>
        </div>
        {/* Animated progress bar */}
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / QUIZ_SECTIONS.length) * 100}%` }}
          />
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
          className="w-full max-w-lg px-6 z-10 py-16"
        >
          <div className="mb-6 text-center space-y-2">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="inline-flex items-center justify-center p-2 bg-white/5 rounded-full mb-3 border border-white/10"
            >
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="text-xs font-medium text-primary uppercase tracking-widest">
                Step {step + 1} of {QUIZ_SECTIONS.length}
              </span>
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground shadow-sm">
              {currentQ.question}
            </h1>
            <p className="text-base text-muted-foreground">{currentQ.subtitle}</p>
          </div>

          {/* Options & Interactive Quiz Rendering */}
          <div className="mb-6">
            {/* 1. Mainstream Hobbies Grid */}
            {currentQ.type === "custom_hobby_mainstream" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>15 Mainstream Trends</span>
                  <span className="font-semibold text-primary">{pickedMainstream.length}/3 selected</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {(hobbyCatalog?.mainstream || []).map((hobby) => {
                    const isSelected = pickedMainstream.includes(hobby.id);
                    return (
                      <button
                        key={hobby.id}
                        onClick={() => toggleMainstreamHobby(hobby.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-primary/20 border-primary shadow-sm text-foreground"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                        }`}
                      >
                        <span className="text-2xl">{hobby.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground leading-tight">{hobby.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                            {hobby.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Freeform Hobby Input */}
            {currentQ.type === "custom_hobby_freeform" && (
              <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-primary" />
                  <label className="text-sm font-semibold text-foreground">
                    Your unlisted hobby / interest:
                  </label>
                </div>
                <Input
                  value={freeformHobby}
                  onChange={(e) => setFreeformHobby(e.target.value.slice(0, 200))}
                  placeholder="e.g. Vintage synth restoration, speedcubing, retro gaming..."
                  maxLength={200}
                  className="samevibe-premium-input w-full px-4 py-3 bg-white/10 border-white/15 text-white placeholder:text-white/40 rounded-xl"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Freeform text (&lt;200 chars)</span>
                  <span>{freeformHobby.length}/200</span>
                </div>
              </div>
            )}

            {/* 3. Emerging Hobbies Grid */}
            {currentQ.type === "custom_hobby_emerging" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> 10 Up-and-Coming Trends
                  </span>
                  <span className="font-semibold text-primary">{pickedEmerging.length} emerging picked</span>
                </div>

                {pickedMainstream.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Original picks: <strong className="text-foreground">{pickedMainstream.length}</strong></span>
                    <button
                      onClick={() => setPickedMainstream([])}
                      className="text-primary hover:underline text-[11px]"
                    >
                      Deselect original picks
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                  {(hobbyCatalog?.emerging || []).map((hobby) => {
                    const isSelected = pickedEmerging.includes(hobby.id);
                    return (
                      <button
                        key={hobby.id}
                        onClick={() => toggleEmergingHobby(hobby.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-amber-500/20 border-amber-400 shadow-sm text-foreground"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground"
                        }`}
                      >
                        <span className="text-2xl">{hobby.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-foreground leading-tight">{hobby.label}</span>
                            {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                            {hobby.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Location Step */}
            {currentQ.id === "location" && (
              <div className="glass-card p-6 rounded-xl border border-white/10 text-center space-y-5">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                  answers.location ? "bg-primary/20" : "bg-cyan-500/20 animate-pulse"
                }`}>
                  <MapPin className={`w-8 h-8 ${answers.location ? "text-primary" : "text-cyan-400"}`} />
                </div>

                {answers.location ? (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Check className="w-4 h-4 text-green-400" />
                      <h3 className="text-xl font-semibold text-foreground">{answers.location}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground/60">We'll find communities near you.</p>
                    <button
                      onClick={() => {
                        setAnswers(prev => ({ ...prev, location: "" }));
                        setShowManualInput(true);
                      }}
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-3 underline underline-offset-2"
                    >
                      Change location
                    </button>
                  </div>
                ) : showManualInput ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">Where are you based?</h3>
                      <p className="text-sm text-muted-foreground">Enter your city and state or country.</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={manualLocationInput}
                        onChange={(e) => setManualLocationInput(e.target.value)}
                        placeholder="e.g. Denver, CO"
                        className="samevibe-premium-input flex-1 px-4 min-h-[46px] bg-white/10 border-white/15 text-white placeholder:text-white/45 caret-white backdrop-blur-xl rounded-xl focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 hover:bg-white/12 transition-all"
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
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      Detecting location...
                    </h3>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      We use this to find communities near you.
                    </p>
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="mt-4 text-sm text-muted-foreground hover:text-foreground border border-border/40 rounded-full px-4 py-2 transition-all hover:bg-muted/30"
                    >
                      Enter manually instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5. Standard Options */}
            {currentQ.type !== "custom_hobby_mainstream" &&
             currentQ.type !== "custom_hobby_freeform" &&
             currentQ.type !== "custom_hobby_emerging" &&
             currentQ.id !== "location" && (
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((option) => {
                  const isSelected = Array.isArray(answers[currentQ.id as keyof QuizAnswers])
                    ? (answers[currentQ.id as keyof QuizAnswers] as string[]).includes(option.value)
                    : answers[currentQ.id as keyof QuizAnswers] === option.value;

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
                      <div className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0
                        transition-all duration-200
                        ${
                          isSelected
                            ? "bg-primary/25 shadow-[inset_0_0_12px_hsl(var(--primary)/0.25)]"
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
                })}
              </div>
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
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-8 rounded-full font-semibold shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:shadow-primary/45"
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