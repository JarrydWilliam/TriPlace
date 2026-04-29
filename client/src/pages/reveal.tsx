import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Zap, CheckCircle2 } from "lucide-react";
import { Community } from "@shared/schema";

export default function Reveal() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const { data: recommendations = [], isLoading } = useQuery<Community[]>({
    queryKey: ["/api/communities/recommended"],
    enabled: !!user,
  });

  // Steps:
  // 0: Initial text typeout
  // 1: Stats summary
  // 2: The grand reveal of communities
  
  useEffect(() => {
    if (isLoading) return;
    
    // Auto-advance through the story
    const timer1 = setTimeout(() => setStep(1), 3500); // Intro -> Stats
    const timer2 = setTimeout(() => setStep(2), 8000); // Stats -> Reveal
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080612] flex items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Determine top category and vibe based on matched communities
  const topCategory = recommendations[0]?.category || "socializing";
  const matchScore = recommendations.length > 0 ? 94 : 0; // Simulated high match score for top recommendation

  return (
    <div className="min-h-screen bg-[#080612] text-white overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[#ff6b35]/20 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-[#ffb347]/10 blur-[120px]"
        />
      </div>

      <div className="h-screen w-full flex flex-col items-center justify-center px-6 relative z-10 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-4 w-full"
            >
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold tracking-tight text-white/90"
              >
                We analyzed your vibe.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-lg text-white/60"
              >
                Connecting your interests to the local scene...
              </motion.p>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -50 }}
              className="w-full space-y-12"
            >
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#ff8c42] to-[#ffb347] bg-clip-text text-transparent">
                  You belong in {topCategory}.
                </h2>
                <p className="text-white/60">Based on your answers, we found your people.</p>
              </div>

              <div className="space-y-6">
                <motion.div 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{matchScore}% Match</p>
                    <p className="text-sm text-white/60">Highest compatibility score</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{recommendations.length} Communities</p>
                    <p className="text-sm text-white/60">Found in your immediate area</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Local Network</p>
                    <p className="text-sm text-white/60">People ready to connect</p>
                  </div>
                </motion.div>
              </div>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => setStep(2)}
                className="mx-auto block text-sm text-white/40 hover:text-white/80 transition-colors"
              >
                Tap to skip
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex flex-col h-full py-12"
            >
              <div className="text-center mb-8">
                <Zap className="w-8 h-8 text-[#ff6b35] mx-auto mb-4" />
                <h2 className="text-3xl font-bold mb-2">Here are your people.</h2>
                <p className="text-white/60">Tap any community to see what they're up to.</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 hide-scrollbar pb-10">
                {recommendations.slice(0, 3).map((community, index) => (
                  <motion.div
                    key={community.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-4">
                      <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                        {94 - (index * 6)}% Match
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-1 pr-24">{community.name}</h3>
                    <p className="text-sm text-[#ff6b35] font-medium mb-3 capitalize">
                      {community.category}
                    </p>
                    <p className="text-sm text-white/70 line-clamp-2 leading-relaxed">
                      {community.description}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="pt-6">
                <Button 
                  className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-[#ff8c42] to-[#ffb347] text-[#080612] font-bold hover:opacity-90 shadow-[0_0_20px_rgba(255,107,53,0.3)] transition-all"
                  onClick={() => setLocation("/dashboard")}
                >
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
