import { Link } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 pb-20">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">Last updated: July 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {[
            {
              title: "1. Information We Collect",
              body: "SameVibe collects information you provide directly, including your name, email address, profile photo, location, and interest preferences. We also collect usage data to improve the experience and ensure safety, including event interactions (RSVPs, clicks), behavioral patterns, and analytics.",
            },
            {
              title: "2. How We Use Your Information",
              body: "SameVibe uses your activity and preferences to personalize recommendations. Your data is used solely to improve your local social discovery experience and for app functionality. We do not sell your personally identifiable information to third parties.",
            },
            {
              title: "3. Location Data",
              body: "SameVibe uses your device's GPS to show local events and connect you with nearby community members. Location data is only used to personalize your feed and is not shared with third parties for advertising purposes.",
            },
            {
              title: "4. AI-Personalized Recommendations",
              body: "SameVibe uses AI to personalize your experience and match you with the right communities. To do this, anonymized interest data, quiz answers, and general location context (city/region level) may be processed by industry-standard AI providers. This data is used solely for generating personalized recommendations and is subject to strict data safety standards. No personally identifiable information (such as your name or email) is shared with these AI providers for training purposes.",
            },
            {
              title: "5. The Discovery Engine",
              body: "Our discovery engine analyzes your activity and attended events to update your interest profile and surface new communities. This allows SameVibe to grow with you as your interests evolve.",
            },
            {
              title: "6. Data Retention & Deletion",
              body: "Users can delete their account and associated data at any time within the app (Settings → Account). Deletion is permanent and removes your database records and authentication credentials immediately.",
            },
            {
              title: "7. Content Moderation & Safety",
              body: "SameVibe maintains a safe community. Users can report or block others directly in the app. Reported content is reviewed by our team and may be removed if it violates our safety standards.",
            },
            {
              title: "8. Contact",
              body: null,
              contact: "privacy@samevibe.app",
            },
          ].map((section, i) => (
            <div
              key={i}
              className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-md"
            >
              <h2 className="text-base font-semibold text-foreground mb-3">{section.title}</h2>
              {section.body ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  For privacy questions, contact us at{" "}
                  <a href={`mailto:${section.contact}`} className="text-primary hover:underline">
                    {section.contact}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer branding */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground/30 text-xs">© 2026 SameVibe. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
