import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-[#080612] flex items-center justify-center relative overflow-hidden px-6">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full opacity-15 blur-[120px] bg-primary/40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 text-center max-w-sm w-full"
      >
        {/* Glowing icon */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10 shadow-2xl backdrop-blur-md mx-auto">
            <Compass className="w-12 h-12 text-primary/80" />
          </div>
        </div>

        <h1 className="text-6xl font-extrabold text-white mb-3 tracking-tight">404</h1>
        <h2 className="text-xl font-semibold text-white/70 mb-3">Lost in the feed?</h2>
        <p className="text-sm text-white/40 mb-8 leading-relaxed">
          This page doesn't exist or has been moved. Head back and we'll find your vibe.
        </p>

        <Button
          onClick={() => setLocation("/dashboard")}
          className="bg-gradient-to-r from-primary to-primary/70 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
        >
          <Home className="w-4 h-4" />
          Go Home
        </Button>
      </motion.div>
    </div>
  );
}
