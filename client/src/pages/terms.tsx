import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 pb-28">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">Last updated: July 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          {[
            {
              title: "1. Acceptance of Terms",
              body: "By using SameVibe, you agree to these Terms of Service. If you do not agree, please do not use the application.",
            },
            {
              title: "2. Eligibility",
              body: "You must be at least 13 years of age to use SameVibe. By creating an account, you represent that you meet this requirement.",
            },
            {
              title: "3. User Content (Zero Tolerance)",
              body: "You are responsible for all content you post. There is absolutely no tolerance for objectionable content, abusive users, harassment, or illegal activity on SameVibe. We actively moderate content and reserve the right to immediately remove any content or permanently ban any user that violates our community safety standards without prior notice.",
            },
            {
              title: "4. Community Rules",
              body: "SameVibe communities are interest-based groups. Members are expected to engage respectfully. SameVibe reserves the right to remove users or content that violates community standards.",
            },
            {
              title: "5. Background Intelligence Agent",
              body: "SameVibe's background intelligence agent automatically analyzes your activity to update your interest profile and suggest communities. You can view and manage agent-inferred interests in your Settings.",
            },
            {
              title: "6. Events & Third-Party Links",
              body: "SameVibe surfaces publicly available event listings and redirects users to the original source for details or ticketing. SameVibe does not host events, sell tickets, or collect event payments. All transactions occur on the original provider's website.",
            },
            {
              title: "7. Limitation of Liability",
              body: 'SameVibe is provided "as is" without warranties of any kind. We are not liable for damages arising from your use of the service.',
            },
            {
              title: "8. Changes",
              body: "We may update these terms at any time. Continued use of SameVibe after changes constitutes acceptance of the new terms.",
            },
            {
              title: "9. Contact",
              body: null,
              contact: "legal@samevibe.app",
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
                  For questions about these terms, contact{" "}
                  <a href={`mailto:${section.contact}`} className="text-accent hover:underline">
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
