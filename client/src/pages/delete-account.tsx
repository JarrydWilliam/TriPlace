import { Link } from "wouter";
import { Trash2, ShieldCheck, ArrowLeft, Smartphone } from "lucide-react";

/**
 * Public-facing account deletion page.
 *
 * Required by Google Play policy: apps that allow account creation must
 * provide a publicly accessible web URL where users can request deletion.
 *
 * URL: https://samevibe.app/delete-account
 * This URL is submitted in:
 *   - Google Play Console → App Content → Data Safety → Account Deletion URL
 *   - Apple App Store Connect → App Privacy → Account Deletion
 */
export default function DeleteAccount() {
  return (
    <div className="min-h-[100dvh] bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back to SameVibe
          </Link>
          <div className="flex items-center gap-3 mt-4 mb-2">
            <div className="p-2 rounded-xl bg-destructive/10">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold">Delete Your Account</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            How to permanently delete your SameVibe account and all associated data.
          </p>
        </div>

        <section className="space-y-6 text-sm text-foreground/80 leading-relaxed">

          <div className="p-4 rounded-xl border border-border bg-muted/30 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground mb-1">Your data belongs to you</p>
              <p>
                SameVibe gives you full control over your account. You can delete your account and all
                associated data at any time — no questions asked, no waiting period.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">How to Delete Your Account</h2>
            <p className="mb-4">
              Account deletion must be done from within the SameVibe app. Follow these steps:
            </p>
            <ol className="space-y-3 list-none">
              {[
                { step: "1", text: "Open the SameVibe app on your device" },
                { step: "2", text: "Tap the Settings icon (⚙️) in the top-right corner of your Dashboard" },
                { step: "3", text: 'Tap "Account" in the settings menu' },
                { step: "4", text: 'Scroll to the bottom and tap "Delete Account"' },
                { step: "5", text: 'Read the confirmation, then tap "Delete Permanently" to confirm' },
              ].map(({ step, text }) => (
                <li key={step} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {step}
                  </span>
                  <span className="mt-0.5">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">What Gets Deleted</h2>
            <p className="mb-2">
              When you delete your account, the following data is <strong>permanently and immediately removed</strong>:
            </p>
            <ul className="space-y-1 list-disc pl-5 text-foreground/70">
              <li>Your profile (name, bio, photo, interests, location data)</li>
              <li>All messages sent and received</li>
              <li>Community memberships and activity history</li>
              <li>Event registrations and attendance records</li>
              <li>Kudos given and received</li>
              <li>Onboarding quiz answers and AI-inferred interest profile</li>
              <li>Your Firebase Authentication credentials (login identity)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Retention Period</h2>
            <p>
              Deletion is immediate and permanent. SameVibe does not retain your personal data after
              account deletion. Anonymized, non-identifiable aggregate analytics (e.g., total event
              views) may be retained for service improvement purposes only.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-muted/30 flex gap-3">
            <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground mb-1">Need help?</p>
              <p>
                If you cannot access the app or need assistance deleting your account, contact our
                support team:{" "}
                <a
                  href="mailto:support@samevibe.app"
                  className="text-primary hover:underline font-medium"
                >
                  support@samevibe.app
                </a>
                . We will process your deletion request within 30 days.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Privacy Policy</h2>
            <p>
              For more information about how we handle your data, please read our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

        </section>
      </div>
    </div>
  );
}
