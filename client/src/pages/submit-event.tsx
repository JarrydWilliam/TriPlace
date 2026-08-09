import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileNav } from "@/components/layout/mobile-nav";
import { VibePageHeader } from "@/components/layout/vibe-page-header";
import {
  Calendar,
  MapPin,
  Tag,
  AlignLeft,
  DollarSign,
  Users,
  Link2,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_CATEGORIES = [
  { value: "Community & Culture", emoji: "🏘️" },
  { value: "Music", emoji: "🎵" },
  { value: "Sports & Fitness", emoji: "⚽" },
  { value: "Arts & Culture", emoji: "🎨" },
  { value: "Food & Drink", emoji: "🍕" },
  { value: "Science & Technology", emoji: "💻" },
  { value: "Health & Wellness", emoji: "🧘" },
  { value: "Business", emoji: "💼" },
  { value: "Education", emoji: "📚" },
  { value: "Outdoor & Recreation", emoji: "🏔️" },
  { value: "Entertainment", emoji: "🎭" },
  { value: "Family", emoji: "👨‍👩‍👧" },
  { value: "Charity & Causes", emoji: "❤️" },
  { value: "Other", emoji: "✨" },
];

interface SubmitEventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  category: string;
  price: string;
  maxAttendees: string;
  sourceUrl: string;
}

export default function SubmitEvent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<SubmitEventForm>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    address: "",
    category: "",
    price: "0",
    maxAttendees: "",
    sourceUrl: "",
  });

  const set = (field: keyof SubmitEventForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submitMutation = useMutation({
    mutationFn: async () => {
      const dateTime = form.date && form.time
        ? new Date(`${form.date}T${form.time}`).toISOString()
        : new Date(`${form.date}T18:00`).toISOString();

      const res = await apiRequest("POST", "/api/events/submit", {
        title: form.title.trim(),
        description: form.description.trim(),
        date: dateTime,
        location: form.location.trim(),
        address: form.address.trim() || form.location.trim(),
        category: form.category,
        price: form.price || "0",
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      trackEvent("event_submitted", { userId: user?.id });
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast({
        title: "Submission failed",
        description: err?.message ?? "Please check your details and try again.",
        variant: "destructive",
      });
    },
  });

  const isValid =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 10 &&
    form.date &&
    form.location.trim().length >= 3 &&
    form.category;

  if (submitted) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-5 max-w-sm"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Event Submitted!</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Your event is under review. We aim to approve events within 24 hours.
            It will appear in the feed once approved.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl"
              onClick={() => setLocation("/events")}
            >
              Back to Events
            </Button>
            <Button
              variant="ghost"
              className="w-full text-white/50 hover:text-white"
              onClick={() => { setSubmitted(false); setForm({ title: "", description: "", date: "", time: "", location: "", address: "", category: "", price: "0", maxAttendees: "", sourceUrl: "" }); }}
            >
              Submit Another Event
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground safe-area-bottom relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <VibePageHeader mode="home" />

      <main className="max-w-md mx-auto px-4 pt-6 pb-32 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => setLocation("/events")}
            className="mt-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white/70" />
          </button>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              Submit an Event
            </h1>
            <p className="text-xs text-white/50 mt-1">
              Share a local event with the SameVibe community
            </p>
          </div>
        </div>

        {/* Review notice */}
        <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/70 leading-relaxed">
            Events are reviewed before going live to ensure quality. Most reviews
            complete within 24 hours.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">

          {/* Title */}
          <FormField icon={<Tag className="w-4 h-4 text-cyan-400" />} label="Event Title *">
            <Input
              id="event-title"
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Sunday Morning Yoga in the Park"
              maxLength={120}
              className="samevibe-input"
            />
          </FormField>

          {/* Description */}
          <FormField icon={<AlignLeft className="w-4 h-4 text-cyan-400" />} label="Description *">
            <textarea
              id="event-description"
              value={form.description}
              onChange={set("description")}
              placeholder="Tell people what to expect, who it's for, what to bring..."
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 resize-none transition-all"
            />
            <p className="text-[10px] text-white/30 text-right">{form.description.length}/2000</p>
          </FormField>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <FormField icon={<Calendar className="w-4 h-4 text-cyan-400" />} label="Date *">
              <input
                id="event-date"
                type="date"
                value={form.date}
                onChange={set("date")}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
              />
            </FormField>
            <FormField icon={<Clock className="w-4 h-4 text-cyan-400" />} label="Time">
              <input
                id="event-time"
                type="time"
                value={form.time}
                onChange={set("time")}
                className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all [color-scheme:dark]"
              />
            </FormField>
          </div>

          {/* Location */}
          <FormField icon={<MapPin className="w-4 h-4 text-cyan-400" />} label="Location / Venue *">
            <Input
              id="event-location"
              value={form.location}
              onChange={set("location")}
              placeholder="e.g. Riverside Park, Denver CO"
              maxLength={200}
              className="samevibe-input"
            />
          </FormField>

          {/* Category */}
          <FormField icon={<Sparkles className="w-4 h-4 text-cyan-400" />} label="Category *">
            <select
              id="event-category"
              value={form.category}
              onChange={set("category")}
              className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none [color-scheme:dark]"
            >
              <option value="" disabled className="bg-gray-900">Select a category...</option>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value} className="bg-gray-900">
                  {c.emoji} {c.value}
                </option>
              ))}
            </select>
          </FormField>

          {/* Price + Max Attendees */}
          <div className="grid grid-cols-2 gap-3">
            <FormField icon={<DollarSign className="w-4 h-4 text-cyan-400" />} label="Price (USD)">
              <Input
                id="event-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={set("price")}
                placeholder="0 = Free"
                className="samevibe-input"
              />
            </FormField>
            <FormField icon={<Users className="w-4 h-4 text-cyan-400" />} label="Max Attendees">
              <Input
                id="event-max-attendees"
                type="number"
                min="1"
                value={form.maxAttendees}
                onChange={set("maxAttendees")}
                placeholder="Optional"
                className="samevibe-input"
              />
            </FormField>
          </div>

          {/* External link */}
          <FormField icon={<Link2 className="w-4 h-4 text-cyan-400" />} label="Event Link (optional)">
            <Input
              id="event-source-url"
              type="url"
              value={form.sourceUrl}
              onChange={set("sourceUrl")}
              placeholder="https://eventbrite.com/... or lu.ma/..."
              className="samevibe-input"
            />
          </FormField>
        </div>

        {/* Submit button */}
        <Button
          id="event-submit-btn"
          onClick={() => submitMutation.mutate()}
          disabled={!isValid || submitMutation.isPending}
          className="w-full h-14 bg-gradient-to-r from-primary to-cyan-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {submitMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Submit for Review
            </span>
          )}
        </Button>
      </main>

      <MobileNav />
    </div>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────
function FormField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-white/70 uppercase tracking-wide">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
