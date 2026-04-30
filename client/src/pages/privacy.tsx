import { Link } from "wouter";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: April 2026</p>
        </div>

        <section className="space-y-4 text-sm text-foreground/80 leading-relaxed">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>SameVibe collects information you provide directly, including your name, email address, profile photo, location, and interest preferences. We also collect usage data to improve the experience and ensure safety, including event interactions (RSVPs, clicks), behavioral patterns, and analytics.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>SameVibe uses your activity and preferences to personalize recommendations. Your data is used solely to improve your local social discovery experience and for app functionality. We do not sell your personally identifiable information to third parties.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Location Data</h2>
            <p>SameVibe uses your device's GPS to show local events and connect you with nearby community members. Location data is only used to personalize your feed and is not shared with third parties for advertising purposes.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. AI-Personalized Recommendations</h2>
            <p>SameVibe uses AI to personalize your experience and match you with the right communities. To do this, anonymized interest data, quiz answers, and general location context (city/region level) may be processed by industry-standard AI providers. This data is used solely for generating personalized recommendations and is subject to strict data safety standards. No personally identifiable information (such as your name or email) is shared with these AI providers for training purposes.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. The Discovery Engine</h2>
            <p>Our discovery engine analyzes your activity and attended events to update your interest profile and surface new communities. This allows SameVibe to grow with you as your interests evolve.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Retention & Deletion</h2>
            <p>Users can delete their account and associated data at any time within the app (Settings → Account). Deletion is permanent and removes your database records and authentication credentials immediately.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Content Moderation & Safety</h2>
            <p>SameVibe maintains a safe community. Users can report or block others directly in the app. Reported content is reviewed by our team and may be removed if it violates our safety standards.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
            <p>For privacy questions, contact us at <a href="mailto:privacy@samevibe.app" className="text-primary hover:underline">privacy@samevibe.app</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}

