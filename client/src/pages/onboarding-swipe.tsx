import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "@/hooks/use-geolocation";

// Quiz sections and options
const quizSections = [
  {
    title: "What are you hoping to find here?",
    subtitle: "Choose up to 3",
    type: "multi",
    key: "intent",
    options: [
      { label: "Real friendships", emoji: "👯‍♀️" },
      { label: "Safe, thoughtful convos", emoji: "💬" },
      { label: "Local events & hangouts", emoji: "🎉" },
      { label: "Collaborators or builders", emoji: "🤝" },
      { label: "Personal growth or support", emoji: "✨" },
      { label: "Chill place to check in", emoji: "🌱" },
    ],
    max: 3,
  },
  {
    title: "How do you want to feel in a community?",
    subtitle: "Pick one",
    type: "single",
    key: "communityFeel",
    options: [
      { label: "Seen & supported" },
      { label: "Inspired & challenged" },
      { label: "Comfortable just being me" },
      { label: "Energized & excited" },
      { label: "Curious & open" },
    ],
  },
  {
    title: "What's your vibe IRL?",
    subtitle: "Pick one",
    type: "single",
    key: "vibe",
    options: [
      { label: "Low-key / introverted", emoji: "🧘‍♂️" },
      { label: "Creative / open-minded", emoji: "🦄" },
      { label: "Driven / ambitious", emoji: "📈" },
      { label: "Warm / social", emoji: "🤗" },
      { label: "Light-hearted / funny", emoji: "😂" },
      { label: "Deep thinker", emoji: "🤓" },
    ],
  },
  {
    title: "Pick a few spaces you'd vibe in",
    subtitle: "Choose 3–6",
    type: "multi",
    key: "interests",
    options: [
      { label: "AI & Tech", emoji: "🔬" },
      { label: "Art & Design", emoji: "🎨" },
      { label: "Startup Builders", emoji: "💻" },
      { label: "Mental Wellness", emoji: "🧠" },
      { label: "Social Impact", emoji: "🌎" },
      { label: "Mindfulness", emoji: "🧘" },
      { label: "Music Scenes", emoji: "🎶" },
      { label: "Bookworms", emoji: "📚" },
      { label: "LGBTQ+ spaces", emoji: "🏳️‍🌈" },
      { label: "Outdoors & Adventure", emoji: "🥾" },
      { label: "Gaming", emoji: "🎮" },
      { label: "Cooking & Culture", emoji: "🍳" },
      { label: "Students & Learners", emoji: "🧑‍🎓" },
      { label: "Parents & Families", emoji: "👶" },
    ],
    min: 3,
    max: 6,
  },
  {
    title: "How active do you want your communities to be?",
    subtitle: "Pick one",
    type: "single",
    key: "activityLevel",
    options: [
      { label: "Super active — daily convos", emoji: "🔥" },
      { label: "Just enough — a few posts a week", emoji: "💬" },
      { label: "Chill pace — low volume", emoji: "🧘" },
      { label: "Mostly browsing for now", emoji: "👀" },
    ],
  },
  {
    title: "When are you usually around?",
    subtitle: "Pick all that apply",
    type: "multi",
    key: "availability",
    options: [
      { label: "Weekday evenings" },
      { label: "Weekends" },
      { label: "Early mornings" },
      { label: "Late nights" },
      { label: "Randomly / no set time" },
    ],
    max: 5,
  },
  {
    title: "Where are you located?",
    subtitle: "Auto-detected but allow override",
    type: "location",
    key: "location",
  },
  {
    title: "Are you open to digital-only spaces too?",
    subtitle: "Pick one",
    type: "single",
    key: "digitalPreference",
    options: [
      { label: "Yes, anywhere with my vibe" },
      { label: "Local only" },
      { label: "Both" },
    ],
  },
  {
    title: "Which statement resonates most with you?",
    subtitle: "Optional",
    type: "single",
    key: "bonusValue",
    options: [
      { label: "I want to grow and explore new parts of myself." },
      { label: "I need a space to feel understood." },
      { label: "I'm excited to find people who get me." },
      { label: "I'm building something and want others on the path." },
      { label: "I'm just here to chill and maybe make a friend or two." },
    ],
    optional: true,
  },
];

export default function OnboardingSwipe() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [locationOverride, setLocationOverride] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFinal, setShowFinal] = useState(false);
  const { latitude, longitude, loading: locationLoading, error: locationError } = useGeolocation(user?.id);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  // Handle selection
  const handleSelect = (key: string, value: string) => {
    const section = quizSections.find((s) => s.key === key);
    if (!section) return;
    if (section.type === "multi") {
      const prev = answers[key] || [];
      if (prev.includes(value)) {
        setAnswers({ ...answers, [key]: prev.filter((v: string) => v !== value) });
      } else if (!section.max || prev.length < section.max) {
        setAnswers({ ...answers, [key]: [...prev, value] });
      }
    } else {
      setAnswers({ ...answers, [key]: value });
    }
  };

  // Handle location
  const handleLocation = (val: string) => {
    setLocationOverride(val);
    setAnswers({ ...answers, location: val });
  };

  // Next/Prev navigation
  const handleNext = () => {
    if (current < quizSections.length - 1) {
      setCurrent(current + 1);
    } else {
      setShowFinal(true);
    }
  };
  const handlePrev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  // Save answers and finish onboarding
  const handleFinish = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/users/${user?.id}`, {
        onboardingCompleted: true,
        quizAnswers: answers,
      });
      navigate("/dashboard");
    } catch {
      setSaving(false);
    }
  };

  // Fetch recommendations when quiz is complete and final screen is shown
  useEffect(() => {
    if (showFinal && user && (latitude || locationOverride)) {
      setRecommendationsLoading(true);
      setRecommendationsError(null);
      const params = new URLSearchParams({
        userId: user.id?.toString() || '',
        latitude: (locationOverride ? '' : latitude?.toString() || ''),
        longitude: (locationOverride ? '' : longitude?.toString() || ''),
        location: locationOverride || '',
        quizAnswers: JSON.stringify(answers),
      });
      fetch(`/api/communities/recommended?${params}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch recommendations');
          return res.json();
        })
        .then(data => setRecommendations(data))
        .catch(err => setRecommendationsError(err.message))
        .finally(() => setRecommendationsLoading(false));
    }
  }, [showFinal, user, latitude, longitude, locationOverride, answers]);

  // Render quiz card
  const renderCard = () => {
    const section = quizSections[current];
    if (!section) return null;
    if (section.type === "location") {
      return (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold">Where are you located?</span>
          </div>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 p-3 text-lg bg-gray-800 text-white"
            placeholder="Enter your city or area"
            value={locationOverride}
            onChange={(e) => handleLocation(e.target.value)}
          />
          <p className="text-gray-400 text-sm">Auto-detected, but you can override for better matches.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-2">{section.title}</h2>
        {section.subtitle && <p className="text-gray-400 mb-4">{section.subtitle}</p>}
        <div className="flex flex-wrap gap-3 justify-center">
          {section.options?.map((opt: any) => {
            const isSelected = section.type === "multi"
              ? (answers[section.key] || []).includes(opt.label)
              : answers[section.key] === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => handleSelect(section.key, opt.label)}
                className={`rounded-xl px-5 py-4 min-w-[120px] min-h-[56px] text-lg font-medium flex flex-col items-center justify-center shadow-md transition-all duration-150 border-2 focus:outline-none focus:ring-2 focus:ring-primary/50
                  ${isSelected ? "bg-primary text-white border-primary" : "bg-gray-800 text-gray-200 border-gray-700 hover:bg-primary/10"}`}
                style={{ boxShadow: isSelected ? "0 4px 16px rgba(80,0,200,0.10)" : undefined }}
              >
                {opt.emoji && <span className="text-2xl mb-1">{opt.emoji}</span>}
                {opt.label}
                {isSelected && <CheckCircle className="w-5 h-5 text-white mt-2" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render final feedback
  const renderFinal = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <h2 className="text-3xl font-bold text-white mb-2">You're matched with:</h2>
      {recommendationsLoading ? (
        <div className="text-white text-lg">Finding your communities...</div>
      ) : recommendationsError ? (
        <div className="text-red-400 text-lg">{recommendationsError}</div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center">
          {Array.isArray(recommendations) && recommendations.length > 0 ? (
            recommendations.slice(0, 3).map((community: any) => (
              <Card key={community.id || community.name} className="bg-gradient-to-br from-purple-600 to-blue-500 text-white shadow-lg">
                <CardContent className="p-4 text-center">
                  <span className="text-2xl">{community.emoji || "🌟"}</span>
                  <div className="font-semibold mt-2">{community.name}</div>
                  {community.description && <div className="text-sm mt-1">{community.description}</div>}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-white text-lg">No matches found. Try updating your quiz answers or location.</div>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button className="bg-primary text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-lg" onClick={handleFinish} disabled={saving}>
          {saving ? "Joining..." : "Join right away"}
        </Button>
        <Button variant="outline" className="px-8 py-3 rounded-xl text-lg font-semibold" onClick={() => navigate("/communities")}>Preview more</Button>
        <Button variant="ghost" className="px-8 py-3 rounded-xl text-lg font-semibold" onClick={() => navigate("/dashboard")}>Save for later</Button>
      </div>
    </div>
  );

  return (
    <div className="mobile-page-container bg-gray-900 min-h-screen flex flex-col items-center justify-center responsive-padding safe-area-top safe-area-bottom">
      <div className="w-full max-w-lg mx-auto">
        <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
          <CardHeader className="flex flex-col items-center">
            <CardTitle className="text-2xl font-bold text-white mb-2">TriPlace Onboarding</CardTitle>
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <span>Step {showFinal ? quizSections.length + 1 : current + 1} of {quizSections.length + 1}</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <AnimatePresence mode="wait" initial={false}>
              {showFinal ? (
                <motion.div
                  key="final"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  {renderFinal()}
                </motion.div>
              ) : (
                <motion.div
                  key={current}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  {renderCard()}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
        <div className="flex justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={current === 0 || showFinal}
            asChild
          >
            <motion.div whileTap={{ scale: 0.92 }}>
              <ChevronLeft className="w-5 h-5" />
              Back
            </motion.div>
          </Button>
          {!showFinal && (
            <Button
              onClick={handleNext}
              className="bg-primary text-white px-6 py-2 rounded-xl font-semibold"
              asChild
            >
              <motion.div whileTap={{ scale: 0.92 }}>
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </motion.div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 