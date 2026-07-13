import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, HelpCircle, Mail, MessageSquare, AlertTriangle, Book, ExternalLink, Send, FileText, Shield, Star } from "lucide-react";
import { Link } from "wouter";

export default function SupportSettings() {
  const { toast } = useToast();
  
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'feedback',
    subject: '',
    message: '',
    email: ''
  });

  const handleSubmitFeedback = () => {
    if (!feedbackForm.subject.trim() || !feedbackForm.message.trim()) {
      toast({ title: "Please fill in subject and message", variant: "destructive" });
      return;
    }
    // Open the user's mail client with the support email pre-filled.
    // This is the most reliable approach for a client-side-only app.
    const email = feedbackForm.email || 'support@samevibe.app';
    const subject = encodeURIComponent(`[${feedbackForm.type}] ${feedbackForm.subject}`);
    const body = encodeURIComponent(feedbackForm.message);
    window.location.href = `mailto:support@samevibe.app?reply-to=${email}&subject=${subject}&body=${body}`;
    setFeedbackForm({ type: 'feedback', subject: '', message: '', email: '' });
  };

  const faqItems = [
    {
      category: "Getting Started",
      questions: [
        { q: "How do I find communities near me?", a: "Complete your onboarding quiz and enable location services for personalized recommendations." },
        { q: "What is the matching quiz?", a: "A 15-question assessment that helps us match you with compatible communities based on your interests and personality." },
        { q: "How do I join a community?", a: "Browse recommended communities on your dashboard and click 'Join Community' on ones that interest you." }
      ]
    },
    {
      category: "Privacy & Safety",
      questions: [
        { q: "How is my location data used?", a: "Location is only used to find nearby communities and members. You can control location sharing in privacy settings." },
        { q: "Can I control who sees my profile?", a: "Yes, you can adjust discovery settings to control profile visibility and community invitations." },
        { q: "How do I report inappropriate content?", a: "Use the report function on any message or profile, or contact support directly." }
      ]
    },
    {
      category: "Communities & Events",
      questions: [
        { q: "How do community events work?", a: "Communities can host paid or free events. Revenue from paid events supports community organizers." },
        { q: "What are kudos?", a: "A way to show appreciation to community members for helpful contributions or positive interactions." },
        { q: "Can I create my own community?", a: "Community creation is currently limited to verified users. Contact support for more information." }
      ]
    }
  ];

  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);

  const handleRate = (star: number) => {
    setRating(star);
    toast({
      title: "Thanks for your feedback!",
      description: `You rated SameVibe ${star} star${star > 1 ? 's' : ''}.`,
    });
  };

  return (
    <div className="mobile-page-container bg-background relative overflow-hidden">
      {/* Rich ambient bokeh */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Help & Support</h1>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span>Get Help</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="mailto:support@samevibe.app?subject=Help%20Request">
                  <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                    <Book className="w-6 h-6 text-blue-500" />
                    <div className="text-center">
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-muted-foreground">support@samevibe.app</p>
                    </div>
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h3 className="font-medium text-lg text-foreground">{category.category}</h3>
                  <div className="space-y-2">
                    {category.questions.map((item, index) => {
                      const faqId = `${category.category}-${index}`;
                      return (
                        <div key={index} className="border border-white/10 rounded-lg bg-background/50">
                          <button
                            className="w-full p-4 text-left font-medium hover:bg-white/5 transition-colors"
                            onClick={() => setExpandedFAQ(expandedFAQ === faqId ? null : faqId)}
                          >
                            {item.q}
                          </button>
                          {expandedFAQ === faqId && (
                            <div className="px-4 pb-4 text-muted-foreground/90">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5" />
                <span>Contact Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Issue Type</Label>
                  <select
                    id="type"
                    value={feedbackForm.type}
                    onChange={(e) => setFeedbackForm({...feedbackForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-white/20 bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="feedback">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="account">Account Issue</option>
                    <option value="community">Community Issue</option>
                    <option value="privacy">Privacy Concern</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={feedbackForm.email}
                    onChange={(e) => setFeedbackForm({...feedbackForm, email: e.target.value})}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={feedbackForm.subject}
                  onChange={(e) => setFeedbackForm({...feedbackForm, subject: e.target.value})}
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({...feedbackForm, message: e.target.value})}
                  placeholder="Please describe your issue in detail..."
                  rows={5}
                />
              </div>

              <Button onClick={handleSubmitFeedback} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Book className="w-5 h-5" />
                <span>Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link href="/terms">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <FileText className="mr-3 h-5 w-5 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">Community Guidelines</p>
                      <p className="text-sm text-muted-foreground">Learn about our community standards</p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
                
                <Link href="/privacy">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <Shield className="mr-3 h-5 w-5 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium">Privacy Policy</p>
                      <p className="text-sm text-muted-foreground">How we protect your data</p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
                
                <Link href="/terms">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <FileText className="mr-3 h-5 w-5 text-purple-500" />
                    <div className="text-left">
                      <p className="font-medium">Terms of Service</p>
                      <p className="text-sm text-muted-foreground">Your rights and responsibilities</p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
                
                <a href="mailto:support@samevibe.app?subject=What's%20New">
                  <Button variant="outline" className="w-full justify-start h-auto p-4">
                    <Star className="mr-3 h-5 w-5 text-yellow-500" />
                    <div className="text-left">
                      <p className="font-medium">What's New</p>
                      <p className="text-sm text-muted-foreground">Latest features and updates</p>
                    </div>
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-white/5 shadow-md">
            <CardHeader>
              <CardTitle>App Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="font-medium">Version</p>
                  <p className="text-sm text-muted-foreground">1.0.0</p>
                </div>
                <div>
                  <p className="font-medium">Platform</p>
                  <p className="text-sm text-muted-foreground">Web</p>
                </div>
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">July 2026</p>
                </div>
                <div>
                  <p className="font-medium">Build</p>
                  <p className="text-sm text-muted-foreground">{import.meta.env.VITE_APP_VERSION || "1.0.0"}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rate SameVibe</p>
                    <p className="text-sm text-muted-foreground">Help us improve with your feedback</p>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        onClick={() => handleRate(star)}
                        className={`w-5 h-5 cursor-pointer hover:scale-110 transition-transform ${star <= rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground/30'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="glass-card bg-card/40 backdrop-blur-xl border border-red-500/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span>Safety & Emergency</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500/90">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  If you're experiencing harassment or feel unsafe, please contact us immediately.
                </p>
              </div>
              
              <div className="space-y-2">
                <a href="mailto:safety@samevibe.app?subject=Report%20Safety%20Issue">
                  <Button variant="outline" className="w-full justify-start text-red-600 mb-2">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Report Safety Issue
                  </Button>
                </a>
                
                <Link href="/terms">
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    Safety Resources
                  </Button>
                </Link>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Emergency Support: <a href="mailto:safety@samevibe.app" className="text-blue-600 hover:underline">safety@samevibe.app</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}