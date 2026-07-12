import { Link } from "wouter";
import { FileText, ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-[100dvh] bg-[#080612] text-white">
      {/* Subtle background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-10 blur-[100px]" style={{ background: "hsl(240,70%,60%)" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12 pb-20">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold">Terms of Service</h1>
          </div>
          <p className="text-white/40 text-sm ml-[52px]">Last updated: July 2026</p>
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
              className="bg-white/5 border border-white/8 rounded-2xl p-6"
            >
              <h2 className="text-base font-semibold text-white mb-3">{section.title}</h2>
              {section.body ? (
                <p className="text-sm text-white/60 leading-relaxed">{section.body}</p>
              ) : (
                <p className="text-sm text-white/60 leading-relaxed">
                  For questions about these terms, contact{" "}
                  <a href={`mailto:${section.contact}`} className="text-blue-400 hover:underline">
                    {section.contact}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer branding */}
        <div className="mt-12 text-center">
          <p className="text-white/20 text-xs">© 2026 SameVibe. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
