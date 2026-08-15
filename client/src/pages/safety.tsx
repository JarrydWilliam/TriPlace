import { Link } from "wouter";
import { Shield, ArrowLeft, AlertTriangle, Mail } from "lucide-react";

export default function Safety() {
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
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Child Safety Standards & CSAM Policy</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">Effective Date: July 2026 | Last updated: August 2026</p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-sm leading-relaxed flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <strong className="block text-foreground font-semibold mb-1">Zero Tolerance Policy</strong>
              SameVibe maintains a strict, non-negotiable zero-tolerance policy regarding Child Sexual Abuse Material (CSAM), Child Sexual Exploitation and Abuse (CSAE), and any form of child endangerment or harm.
            </div>
          </div>

          {[
            {
              title: "1. Prohibition of Child Exploitation Material (CSAM/CSAE)",
              body: "SameVibe explicitly prohibits the creation, possession, solicitation, distribution, or uploading of any content that depicts, promotes, or facilitates child sexual abuse or exploitation. Any account attempting to share CSAM or engage in CSAE will be permanently banned immediately, and reported to legal authorities.",
            },
            {
              title: "2. Reporting to NCMEC & Law Enforcement",
              body: "In accordance with federal laws (18 U.S.C. § 2258A) and international child safety frameworks, SameVibe immediately reports all instances of suspected CSAM or child exploitation to the National Center for Missing & Exploited Children (NCMEC) CyberTipline and relevant local and international law enforcement agencies.",
            },
            {
              title: "3. In-App Safety & User Reporting Mechanisms",
              body: "SameVibe provides built-in, 24/7 user reporting tools. Users can flag objectionable content, profiles, or messages directly within the app by tapping the report icon. All child safety reports are prioritized for immediate review and action by our moderation team.",
            },
            {
              title: "4. Automated & Human Content Moderation",
              body: "We employ proactive content safety filters, automated keyword monitoring, and human review systems to detect, block, and remove inappropriate content before or immediately upon publication.",
            },
            {
              title: "5. Designated Child Safety Point of Contact",
              body: "For inquiries, urgent child safety concerns, or regulatory compliance matters regarding CSAM prevention practices, our designated safety contact is reachable directly at: jarryd@samevibeapp.com.",
            },
          ].map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{section.body}</p>
            </div>
          ))}

          <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Contact Safety Team: jarryd@samevibeapp.com</span>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
