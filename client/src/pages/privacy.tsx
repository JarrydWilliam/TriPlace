import { Link } from "wouter";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: February 2026</p>
        </div>

        <section className="space-y-4 text-sm text-foreground/80 leading-relaxed">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>TriPlace collects information you provide directly, including your name, email address, profile photo, location, and interest preferences gathered during onboarding. We also collect usage data such as events attended, communities joined, posts created, and kudos given.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>We use your information to personalize your experience, match you with relevant communities, surface local events, and power the TriPlace background agent that learns your evolving interests. We do not sell your data to third parties.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Location Data</h2>
            <p>TriPlace uses your device's GPS to show local events and connect you with nearby community members. Location data is only used to personalize your feed and is not shared with third parties for advertising purposes.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Background Agent</h2>
            <p>Our in-app intelligence agent analyzes your community activity, attended events, and local social activity to update your interest profile and surface new communities. All processing is done on our servers and does not involve sharing your data with third-party AI services.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time through the Settings page.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Contact</h2>
            <p>For privacy questions, contact us at <a href="mailto:privacy@triplace.app" className="text-primary hover:underline">privacy@triplace.app</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
