import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { ComponentLoadingSpinner } from "@/components/loading-spinner";

interface QuizAnswers {
  // Section 1: Past Experiences
  pastActivities: string[];
  pastActivitiesOther: string;
  volunteered: string;
  volunteerDescription: string;
  pastHobby: string;
  
  // Section 2: Present Interests
  currentInterests: string[];
  currentInterestsOther: string;
  weekendActivities: string[];
  weekendActivitiesOther: string;
  lifestyleParts: string[];
  
  // Section 3: Future Goals
  futureGoal: string;
  futureGoals: string[];
  futureGoalsOther: string;
  dreamCommunity: string;
  
  // Section 4: Personality & Preferences
  groupPreference: string;
  travelDistance: string;
  connectionTypes: string[];
  
  // Section 5: Free Input
  dreamCommunityName: string;
  idealVibe: string;
  personalIntro: string;
}

const sections = [
  { title: "Past Experiences", subtitle: "What shaped your journey?", icon: "🕰️" },
  { title: "Present Passions", subtitle: "What drives you today?", icon: "🧭" },
  { title: "Future Aspirations", subtitle: "Where are you growing?", icon: "🚀" },
  { title: "Connection Style", subtitle: "How do you thrive in community?", icon: "🔍" },
  { title: "Your Third Place Vision", subtitle: "Design your ideal community space", icon: "✍️" }
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    pastActivities: [],
    pastActivitiesOther: "",
    volunteered: "",
    volunteerDescription: "",
    pastHobby: "",
    currentInterests: [],
    currentInterestsOther: "",
    weekendActivities: [],
    weekendActivitiesOther: "",
    lifestyleParts: [],
    futureGoal: "",
    futureGoals: [],
    futureGoalsOther: "",
    dreamCommunity: "",
    groupPreference: "",
    travelDistance: "",
    connectionTypes: [],
    dreamCommunityName: "",
    idealVibe: "",
    personalIntro: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const updateUserMutation = useMutation({
    mutationFn: async (quizData: QuizAnswers) => {
      if (!user) throw new Error("No user found");
      
      // Extract interests from quiz answers
      const interests = [
        ...answers.pastActivities,
        ...answers.currentInterests,
        ...answers.weekendActivities,
        ...answers.lifestyleParts,
        ...answers.futureGoals,
        ...answers.connectionTypes
      ].filter(Boolean);
      
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, { 
        interests: interests,
        bio: answers.personalIntro || `${answers.idealVibe} | ${answers.dreamCommunity}`.substring(0, 500),
        onboardingCompleted: true,
        quizAnswers: quizData
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/firebase/${user?.firebaseUid}`] });
      toast({
        title: "Welcome to TriPlace!",
        description: "Your profile is complete. Let's find your community!",
      });
      // Small delay to ensure user data is updated before navigation
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckboxChange = (field: keyof QuizAnswers, value: string, checked: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }));
  };

  const handleTextChange = (field: keyof QuizAnswers, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      updateUserMutation.mutate(answers);
    }
  };

  const handlePrevious = () => {
    if (currentSection === 0) {
      navigate("/");
    } else {
      setCurrentSection(prev => prev - 1);
    }
  };

  const progressValue = ((currentSection + 1) / sections.length) * 100;

  if (authLoading) {
    return <ComponentLoadingSpinner text="Loading your onboarding..." />;
  }

  if (!user) {
    return null;
  }

  const renderSection = () => {
    switch (currentSection) {
      case 0: // Past Experiences
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                In the past 12 months, which of these have you participated in?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "🏃‍♂️ A race or athletic competition",
                  "🎵 A concert or music festival", 
                  "📚 A book club or reading challenge",
                  "🧘 A mindfulness or wellness retreat",
                  "💼 A networking or professional event",
                  "✈️ A trip to a new city or country",
                  "🎮 An online or in-person gaming event",
                  "🎨 An art show or creative workshop"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <Checkbox
                      id={option}
                      checked={answers.pastActivities.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('pastActivities', option, checked as boolean)
                      }
                      className="min-h-[44px] min-w-[44px]"
                    />
                    <label htmlFor={option} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">Other activities:</label>
                <Textarea
                  value={answers.pastActivitiesOther}
                  onChange={(e) => handleTextChange('pastActivitiesOther', e.target.value)}
                  placeholder="Tell us about other activities you've enjoyed..."
                  className="min-h-[44px] text-base"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Have you volunteered for a cause you care about?
              </h3>
              <div className="space-y-3">
                {["Yes, regularly", "Yes, occasionally", "Not yet, but I'd like to", "Not interested"].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <input
                      type="radio"
                      id={`volunteered-${option}`}
                      name="volunteered"
                      value={option}
                      checked={answers.volunteered === option}
                      onChange={(e) => handleTextChange('volunteered', e.target.value)}
                      className="min-h-[20px] min-w-[20px]"
                    />
                    <label htmlFor={`volunteered-${option}`} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
              {(answers.volunteered === "Yes, regularly" || answers.volunteered === "Yes, occasionally") && (
                <div className="mt-4">
                  <label className="text-sm text-gray-300 mb-2 block">Tell us about your volunteer experience:</label>
                  <Textarea
                    value={answers.volunteerDescription}
                    onChange={(e) => handleTextChange('volunteerDescription', e.target.value)}
                    placeholder="What cause did you support and what did you do?"
                    className="min-h-[44px] text-base"
                  />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What's a hobby or interest you used to love but haven't pursued recently?
              </h3>
              <Textarea
                value={answers.pastHobby}
                onChange={(e) => handleTextChange('pastHobby', e.target.value)}
                placeholder="Maybe something you'd like to pick up again..."
                className="min-h-[44px] text-base"
              />
            </div>
          </div>
        );

      case 1: // Present Interests
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What are you most interested in right now?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "🏋️ Fitness and health",
                  "🎨 Creative arts and crafts",
                  "💻 Technology and innovation",
                  "🌱 Environmental sustainability",
                  "📈 Career and professional growth",
                  "🧘 Mindfulness and spirituality",
                  "🍳 Cooking and food culture",
                  "📚 Learning new skills"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <Checkbox
                      id={option}
                      checked={answers.currentInterests.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('currentInterests', option, checked as boolean)
                      }
                      className="min-h-[44px] min-w-[44px]"
                    />
                    <label htmlFor={option} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">Other interests:</label>
                <Textarea
                  value={answers.currentInterestsOther}
                  onChange={(e) => handleTextChange('currentInterestsOther', e.target.value)}
                  placeholder="What else captures your attention these days?"
                  className="min-h-[44px] text-base"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                How do you typically spend your weekends?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "🏞️ Exploring outdoors",
                  "🏠 Relaxing at home",
                  "👥 Socializing with friends",
                  "🛍️ Shopping and errands",
                  "📱 Scrolling social media",
                  "🎮 Gaming or entertainment",
                  "💼 Working on side projects",
                  "🏃 Being active and exercising"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <Checkbox
                      id={option}
                      checked={answers.weekendActivities.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('weekendActivities', option, checked as boolean)
                      }
                      className="min-h-[44px] min-w-[44px]"
                    />
                    <label htmlFor={option} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Which of these are important parts of your lifestyle?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "🌅 Early mornings and productivity",
                  "🌙 Night owl and late activities",
                  "🥗 Healthy eating and nutrition",
                  "🎉 Social events and gatherings",
                  "🧘 Quiet time and reflection",
                  "💪 Regular exercise routine",
                  "🎓 Continuous learning",
                  "🏡 Family time and relationships"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <Checkbox
                      id={option}
                      checked={answers.lifestyleParts.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('lifestyleParts', option, checked as boolean)
                      }
                      className="min-h-[44px] min-w-[44px]"
                    />
                    <label htmlFor={option} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Future Goals
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What's the most important goal you're working toward this year?
              </h3>
              <Textarea
                value={answers.futureGoal}
                onChange={(e) => handleTextChange('futureGoal', e.target.value)}
                placeholder="This could be personal, professional, health-related, or anything meaningful to you..."
                className="min-h-[44px] text-base"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What areas of growth are you excited about?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "💼 Career advancement",
                  "🏃 Physical fitness",
                  "🧠 Mental health and wellbeing",
                  "💰 Financial stability",
                  "❤️ Relationships and connections",
                  "🎨 Creative skills",
                  "🌍 Travel and cultural experiences",
                  "🎓 Education and knowledge"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <Checkbox
                      id={option}
                      checked={answers.futureGoals.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('futureGoals', option, checked as boolean)
                      }
                      className="min-h-[44px] min-w-[44px]"
                    />
                    <label htmlFor={option} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">Other growth areas:</label>
                <Textarea
                  value={answers.futureGoalsOther}
                  onChange={(e) => handleTextChange('futureGoalsOther', e.target.value)}
                  placeholder="What else are you looking to develop or improve?"
                  className="min-h-[44px] text-base"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Imagine your ideal community 5 years from now. What does it look like?
              </h3>
              <Textarea
                value={answers.dreamCommunity}
                onChange={(e) => handleTextChange('dreamCommunity', e.target.value)}
                placeholder="Think about the people, activities, values, and atmosphere..."
                className="min-h-[44px] text-base"
              />
            </div>
          </div>
        );

      case 3: // Connection Style
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What size group do you feel most comfortable in?
              </h3>
              <div className="space-y-3">
                {[
                  "1-on-1 conversations",
                  "Small groups (3-6 people)",
                  "Medium groups (7-15 people)",
                  "Large groups (16+ people)",
                  "It depends on the activity"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <input
                      type="radio"
                      id={`group-${option}`}
                      name="groupPreference"
                      value={option}
                      checked={answers.groupPreference === option}
                      onChange={(e) => handleTextChange('groupPreference', e.target.value)}
                      className="min-h-[20px] min-w-[20px]"
                    />
                    <label htmlFor={`group-${option}`} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                How far would you travel for the right community activity?
              </h3>
              <div className="space-y-3">
                {[
                  "Within my neighborhood (0-2 miles)",
                  "Across town (3-10 miles)",
                  "Anywhere in my city (11-25 miles)",
                  "Neighboring cities (26-50 miles)",
                  "I'll travel far for the right experience (50+ miles)"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <input
                      type="radio"
                      id={`travel-${option}`}
                      name="travelDistance"
                      value={option}
                      checked={answers.travelDistance === option}
                      onChange={(e) => handleTextChange('travelDistance', e.target.value)}
                      className="min-h-[20px] min-w-[20px]"
                    />
                    <label htmlFor={`travel-${option}`} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What types of connections are you looking for?
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  "🤝 Professional networking",
                  "👫 Casual friendships",
                  "💡 Mentorship opportunities",
                  "🎯 Accountability partners",
                  "🎨 Creative collaborations",
                  "🏃 Activity buddies",
                  "🧠 Intellectual discussions",
                  "💙 Emotional support"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                    <Checkbox
                      id={option}
                      checked={answers.connectionTypes.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('connectionTypes', option, checked as boolean)
                      }
                      className="min-h-[44px] min-w-[44px]"
                    />
                    <label htmlFor={option} className="text-sm text-gray-300 cursor-pointer flex-1">{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4: // Free Input
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                If you could name your dream community, what would you call it?
              </h3>
              <Textarea
                value={answers.dreamCommunityName}
                onChange={(e) => handleTextChange('dreamCommunityName', e.target.value)}
                placeholder="Something that captures the spirit of what you're looking for..."
                className="min-h-[44px] text-base"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What kind of vibe or energy do you want in your community spaces?
              </h3>
              <Textarea
                value={answers.idealVibe}
                onChange={(e) => handleTextChange('idealVibe', e.target.value)}
                placeholder="Energetic and inspiring? Calm and supportive? Creative and innovative?"
                className="min-h-[44px] text-base"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Finally, introduce yourself! What would you want your future community to know about you?
              </h3>
              <Textarea
                value={answers.personalIntro}
                onChange={(e) => handleTextChange('personalIntro', e.target.value)}
                placeholder="Share your personality, what makes you unique, or what you're passionate about..."
                className="min-h-[120px] text-base"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Mobile-First Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <Logo size="md" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome to TriPlace</h1>
              <p className="text-sm text-gray-400">Let's build your community profile</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>{currentSection + 1} of {sections.length}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <Progress value={progressValue} className="h-2 mb-2" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-2 mb-2 sm:mb-0">
              <span className="text-2xl">{sections[currentSection].icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-white">{sections[currentSection].title}</h2>
                <p className="text-sm text-gray-400">{sections[currentSection].subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Content */}
        <Card className="mb-8 bg-gray-800/50 border-gray-700">
          <CardContent className="p-4 sm:p-6">
            {renderSection()}
          </CardContent>
        </Card>

        {/* Mobile-First Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="min-h-[44px] order-2 sm:order-1"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {currentSection === 0 ? "Back to Login" : "Previous"}
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={updateUserMutation.isPending}
            className="min-h-[44px] order-1 sm:order-2"
          >
            {updateUserMutation.isPending ? (
              "Saving..."
            ) : currentSection === sections.length - 1 ? (
              "Complete Profile"
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
