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
    toast({ title: "Feedback sent successfully!", description: "We'll review your message and get back to you." });
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

  return (
    <div className="mobile-page-container bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span>Get Help</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Book className="w-6 h-6 text-blue-500" />
                  <div className="text-center">
                    <p className="font-medium">Help Center</p>
                    <p className="text-sm text-gray-500">Browse articles</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <MessageSquare className="w-6 h-6 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium">Live Chat</p>
                    <p className="text-sm text-gray-500">Chat with support</p>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Mail className="w-6 h-6 text-purple-500" />
                  <div className="text-center">
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-gray-500">Get detailed help</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((category) => (
                <div key={category.category} className="space-y-2">
                  <h3 className="font-medium text-lg text-gray-900 dark:text-white">{category.category}</h3>
                  <div className="space-y-2">
                    {category.questions.map((item, index) => {
                      const faqId = `${category.category}-${index}`;
                      return (
                        <div key={index} className="border rounded-lg">
                          <button
                            className="w-full p-4 text-left font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setExpandedFAQ(expandedFAQ === faqId ? null : faqId)}
                          >
                            {item.q}
                          </button>
                          {expandedFAQ === faqId && (
                            <div className="px-4 pb-4 text-gray-600 dark:text-gray-400">
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
          <Card>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Book className="w-5 h-5" />
                <span>Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start h-auto p-4">
                  <FileText className="mr-3 h-5 w-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Community Guidelines</p>
                    <p className="text-sm text-gray-500">Learn about our community standards</p>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Shield className="mr-3 h-5 w-5 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">Privacy Policy</p>
                    <p className="text-sm text-gray-500">How we protect your data</p>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <FileText className="mr-3 h-5 w-5 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">Terms of Service</p>
                    <p className="text-sm text-gray-500">Your rights and responsibilities</p>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
                
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Star className="mr-3 h-5 w-5 text-yellow-500" />
                  <div className="text-left">
                    <p className="font-medium">What's New</p>
                    <p className="text-sm text-gray-500">Latest features and updates</p>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* App Information */}
          <Card>
            <CardHeader>
              <CardTitle>App Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="font-medium">Version</p>
                  <p className="text-sm text-gray-500">1.0.0</p>
                </div>
                <div>
                  <p className="font-medium">Platform</p>
                  <p className="text-sm text-gray-500">Web</p>
                </div>
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-gray-500">Dec 2024</p>
                </div>
                <div>
                  <p className="font-medium">Build</p>
                  <p className="text-sm text-gray-500">#1234</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rate TriPlace</p>
                    <p className="text-sm text-gray-500">Help us improve with your feedback</p>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 text-yellow-400 fill-current cursor-pointer hover:scale-110 transition-transform" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span>Safety & Emergency</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  If you're experiencing harassment or feel unsafe, please contact us immediately.
                </p>
              </div>
              
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start text-red-600">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report Safety Issue
                </Button>
                
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Safety Resources
                </Button>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-gray-500">
                  Emergency Support: <a href="mailto:safety@triplace.com" className="text-blue-600 hover:underline">safety@triplace.com</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}