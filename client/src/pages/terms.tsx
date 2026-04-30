import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: February 2026</p>
        </div>

        <section className="space-y-4 text-sm text-foreground/80 leading-relaxed">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By using SameVibe, you agree to these Terms of Service. If you do not agree, please do not use the application.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Eligibility</h2>
            <p>You must be at least 13 years of age to use SameVibe. By creating an account, you represent that you meet this requirement.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. User Content</h2>
            <p>You are responsible for all content you post, including community posts, messages, and profile information. You agree not to post content that is illegal, harassing, defamatory, or violates the rights of others.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Community Rules</h2>
            <p>SameVibe communities are interest-based groups. Members are expected to engage respectfully. SameVibe reserves the right to remove users or content that violates community standards.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Background Agent</h2>
            <p>SameVibe's background intelligence agent automatically analyzes your activity to update your interest profile and suggest communities. You can view and manage agent-inferred interests in your Settings.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Limitation of Liability</h2>
            <p>SameVibe is provided "as is" without warranties of any kind. We are not liable for damages arising from your use of the service.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Changes</h2>
            <p>We may update these terms at any time. Continued use of SameVibe after changes constitutes acceptance of the new terms.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Contact</h2>
            <p>For questions about these terms, contact <a href="mailto:legal@samevibe.app" className="text-primary hover:underline">legal@samevibe.app</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}
